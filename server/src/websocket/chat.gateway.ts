import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { CallsService } from '../calls/calls.service';
import { SendMessageDto } from '../messages/dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    private callsService: CallsService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (socket.handshake.query?.token as string);

      if (!token) {
        socket.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'ichat_super_secret_access_key_2026_key_change_me';
      const payload = this.jwtService.verify(token, { secret });

      const userId = payload.sub;
      socket.data.userId = userId;

      this.connectedUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);

      await this.userModel.findByIdAndUpdate(userId, {
        isOnline: true,
      });

      await this.messagesService.markAsDeliveredForUser(userId);

      this.server.emit('user:online', { userId });
      this.logger.log(`Socket connected: ${socket.id} (User: ${userId})`);
    } catch (err) {
      this.logger.error(`WebSocket Connection Error: ${err.message}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      const lastSeen = new Date();

      await this.userModel.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen,
      });

      this.server.emit('user:offline', { userId, lastSeen });
      this.logger.log(`Socket disconnected: ${socket.id} (User: ${userId})`);
    }
  }

  @SubscribeMessage('conversation:join')
  handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    socket.join(`conversation:${conversationId}`);
    return { event: 'conversation:joined', data: { conversationId } };
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    socket.leave(`conversation:${conversationId}`);
    return { event: 'conversation:left', data: { conversationId } };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = socket.data.userId;
    if (!userId) return;

    const conv = await this.conversationsService.getConversationFormatted(
      dto.conversationId,
      userId,
    );

    const receiverId = conv.opponent?._id ? conv.opponent._id.toString() : null;
    if (receiverId && this.connectedUsers.has(receiverId)) {
      dto.status = 'DELIVERED';
    } else {
      dto.status = 'SENT';
    }

    const message = await this.messagesService.createMessage(userId, dto);

    this.server
      .to(`conversation:${dto.conversationId}`)
      .emit('message:new', message);

    this.server.emit('conversation:updated', conv);

    return { status: 'ok', message };
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; conversationId: string; newText: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return;

    const message = await this.messagesService.editMessage(
      data.messageId,
      userId,
      data.newText,
    );

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('message:edited', message);
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; conversationId: string; forEveryone: boolean },
  ) {
    const userId = socket.data.userId;
    if (!userId) return;

    const message = await this.messagesService.deleteMessage(
      data.messageId,
      userId,
      data.forEveryone,
    );

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('message:deleted', message);
  }

  @SubscribeMessage('message:react')
  async handleReactMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; conversationId: string; emoji: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return;

    const message = await this.messagesService.toggleReaction(
      data.messageId,
      userId,
      data.emoji,
    );

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('message:reaction', message);
  }

  @SubscribeMessage('message:pin')
  async handlePinMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    const message = await this.messagesService.togglePinMessage(data.messageId);

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('message:pinned', message);
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.userId;
    socket.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.userId;
    socket.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = socket.data.userId;
    if (!userId) return;

    await this.messagesService.markAsRead(data.conversationId, userId);

    this.server.to(`conversation:${data.conversationId}`).emit('message:read', {
      conversationId: data.conversationId,
      readByUserId: userId,
    });
  }

  /* WebRTC Signaling Handlers */
  @SubscribeMessage('call:invite')
  handleCallInvite(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { toUserId: string; callType: 'AUDIO' | 'VIDEO'; offer: any },
  ) {
    const fromUserId = socket.data.userId;
    this.server.to(`user:${data.toUserId}`).emit('call:incoming', {
      fromUserId,
      callType: data.callType,
      offer: data.offer,
    });
  }

  @SubscribeMessage('call:accept')
  handleCallAccept(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { toUserId: string; answer: any },
  ) {
    const fromUserId = socket.data.userId;
    this.server.to(`user:${data.toUserId}`).emit('call:accepted', {
      fromUserId,
      answer: data.answer,
    });
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { toUserId: string; type?: 'AUDIO' | 'VIDEO' },
  ) {
    const fromUserId = socket.data.userId;
    this.server.to(`user:${data.toUserId}`).emit('call:rejected', {
      fromUserId,
    });

    await this.callsService.logCall(
      data.toUserId,
      fromUserId,
      data.type || 'AUDIO',
      'REJECTED',
      0,
    );
  }

  @SubscribeMessage('call:candidate')
  handleCallCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { toUserId: string; candidate: any },
  ) {
    const fromUserId = socket.data.userId;
    this.server.to(`user:${data.toUserId}`).emit('call:candidate', {
      fromUserId,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { toUserId: string; type?: 'AUDIO' | 'VIDEO'; duration?: number },
  ) {
    const fromUserId = socket.data.userId;
    this.server.to(`user:${data.toUserId}`).emit('call:ended', {
      fromUserId,
    });

    if (data.toUserId) {
      await this.callsService.logCall(
        fromUserId,
        data.toUserId,
        data.type || 'AUDIO',
        'COMPLETED',
        data.duration || 0,
      );
    }
  }
}
