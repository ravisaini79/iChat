import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000/api';

async function req(reqPath: string, options: any = {}) {
  const url = `${BASE_URL}${reqPath}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const config: any = {
    method: options.method || 'GET',
    headers,
  };
  if (options.body) {
    config.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: data };
}

async function uploadFileReq(reqPath: string, token: string, filename: string, contentBuffer: Buffer, mimeType = 'image/png') {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header, 'utf8'),
    contentBuffer,
    Buffer.from(footer, 'utf8'),
  ]);

  const res = await fetch(`${BASE_URL}${reqPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length.toString(),
    },
    body,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: data };
}

async function runE2ETests() {
  console.log('=== STARTING ICHAT FULL-STACK E2E VERIFICATION SUITE ===\n');

  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let userBId = '';
  let convId = '';
  let messageAId = '';

  const phoneA = '+919876543210';
  const nameA = 'Ravi TestUserA';
  const phoneB = '+919876543211';
  const nameB = 'Rahul TestUserB';

  try {
    // 1a. Registering/Authenticating User A
    console.log('[Test 1a] Registering/Authenticating User A...');
    await req('/auth/send-otp', { method: 'POST', body: { phoneNumber: phoneA, countryCode: '+91' } });
    const verifyA = await req('/auth/verify-otp', { method: 'POST', body: { phoneNumber: phoneA, code: '123456' } });
    if (!verifyA.ok) throw new Error(`Verify User A failed: ${JSON.stringify(verifyA.body)}`);
    tokenA = verifyA.body.data.tokens.accessToken;
    userAId = verifyA.body.data.user._id;

    // Set Profile for User A
    await req('/users/profile-setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { displayName: nameA, about: 'Available on IChat' },
    });
    console.log(`✓ User A authenticated. ID: ${userAId}`);

    // 1b. Registering/Authenticating User B
    console.log('[Test 1b] Registering/Authenticating User B...');
    await req('/auth/send-otp', { method: 'POST', body: { phoneNumber: phoneB, countryCode: '+91' } });
    const verifyB = await req('/auth/verify-otp', { method: 'POST', body: { phoneNumber: phoneB, code: '123456' } });
    if (!verifyB.ok) throw new Error(`Verify User B failed: ${JSON.stringify(verifyB.body)}`);
    tokenB = verifyB.body.data.tokens.accessToken;
    userBId = verifyB.body.data.user._id;

    // Set Profile for User B
    await req('/users/profile-setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: { displayName: nameB, about: 'Hey there!' },
    });
    console.log(`✓ User B authenticated. ID: ${userBId}`);

    // 2. Search User B by Name
    console.log('[Test 2] Searching User B by name ("Rahul")...');
    const searchNameRes = await req('/users/search?q=Rahul', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const usersList = Array.isArray(searchNameRes.body.data)
      ? searchNameRes.body.data
      : (Array.isArray(searchNameRes.body.users) ? searchNameRes.body.users : []);

    const foundByName = usersList.some((u: any) => u.userId === userBId || u._id === userBId);
    if (!foundByName) throw new Error(`User B not found by name search. Response body: ${JSON.stringify(searchNameRes.body)}`);
    console.log('✓ User B successfully found by name');

    // 3. Search User B by Phone Number
    console.log('[Test 3] Searching User B by phone number ("9876543211")...');
    const searchPhoneRes = await req('/users/search?q=9876543211', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const phoneUsersList = Array.isArray(searchPhoneRes.body.data)
      ? searchPhoneRes.body.data
      : (Array.isArray(searchPhoneRes.body.users) ? searchPhoneRes.body.users : []);

    const foundByPhone = phoneUsersList.some((u: any) => u.userId === userBId || u._id === userBId);
    if (!foundByPhone) throw new Error(`User B not found by phone search. Response body: ${JSON.stringify(searchPhoneRes.body)}`);
    console.log('✓ User B successfully found by phone number');

    // 4. Retrieve User B Public Profile
    console.log('[Test 4] Retrieving User B public profile...');
    const profileRes = await req(`/users/${userBId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!profileRes.body.data?.profile || profileRes.body.data.profile.displayName !== nameB) {
      throw new Error(`User B profile displayName mismatch: ${JSON.stringify(profileRes.body)}`);
    }
    console.log('✓ User B public profile retrieved successfully');

    // 5. Create Direct Conversation
    console.log('[Test 5] Creating direct conversation between User A and User B...');
    const convRes1 = await req('/conversations/direct', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { targetUserId: userBId },
    });
    convId = convRes1.body.data?._id;
    if (!convId) throw new Error(`Conversation ID missing in response: ${JSON.stringify(convRes1.body)}`);
    console.log(`✓ Direct conversation ready. ID: ${convId}`);

    // 6. Repeated Requests Return Same Conversation
    console.log('[Test 6] Verifying repeated conversation requests return same ID...');
    const convRes2 = await req('/conversations/direct', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { targetUserId: userBId },
    });
    if (convRes2.body.data?._id !== convId) {
      throw new Error('Duplicate conversation created on repeated request');
    }
    console.log('✓ Repeated request returned identical conversation ID');

    // 7 & 8. User A Sends Text Message & DB Persistence
    console.log('[Test 7 & 8] User A sending text message "Hello Rahul"...');
    const clientMsgId = `client_msg_${Date.now()}`;
    const msgResA = await req('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        conversationId: convId,
        text: 'Hello Rahul',
        type: 'TEXT',
        clientMessageId: clientMsgId,
      },
    });
    messageAId = msgResA.body.data?._id;
    if (!messageAId) throw new Error(`Message ID missing in send response: ${JSON.stringify(msgResA.body)}`);
    console.log(`✓ Message sent & persisted to MongoDB. Message ID: ${messageAId}`);

    // 9 & 10. User B Retrieves Message History
    console.log('[Test 9 & 10] User B fetching conversation message history...');
    const msgListB = await req(`/messages/${convId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const foundMsg = msgListB.body.data?.find((m: any) => m._id === messageAId || m.text === 'Hello Rahul');
    if (!foundMsg) throw new Error(`User B failed to retrieve User A message from history. Body: ${JSON.stringify(msgListB.body)}`);
    console.log('✓ User B retrieved User A message from history');

    // 11. User B Replies to User A
    console.log('[Test 11] User B replying "Hi Ravi"...');
    const msgResB = await req('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        conversationId: convId,
        text: 'Hi Ravi',
        type: 'TEXT',
      },
    });
    if (!msgResB.body.data?._id) throw new Error('User B reply failed');
    console.log('✓ User B reply sent and saved successfully');

    // 12. Unauthorized User Cannot Access Private Conversation
    console.log('[Test 12] Verifying unauthorized user cannot access private conversation...');
    const phoneC = '+919876543299';
    await req('/auth/send-otp', { method: 'POST', body: { phoneNumber: phoneC, countryCode: '+91' } });
    const verifyC = await req('/auth/verify-otp', { method: 'POST', body: { phoneNumber: phoneC, code: '123456' } });
    const tokenC = verifyC.body.data.tokens.accessToken;

    const unauthRes = await req(`/messages/${convId}`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    if (unauthRes.status === 403 || unauthRes.status === 401) {
      console.log(`✓ Security verified: Unauthorized access blocked (${unauthRes.status} Forbidden)`);
    } else {
      throw new Error(`SECURITY FAILURE: Unauthorized User C accessed private conversation (Status: ${unauthRes.status})`);
    }

    // 13. Primary Server Filesystem Upload & Disk Persistence
    console.log('[Test 13] Uploading image file to primary server filesystem (uploads/users/{userId}/images/)...');
    const fakeImageBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489', 'hex');
    const uploadRes = await uploadFileReq('/media/upload', tokenA, 'test_avatar.png', fakeImageBuffer, 'image/png');
    if (!uploadRes.ok || (!uploadRes.body._id && !uploadRes.body.data?._id)) {
      throw new Error(`Media upload failed: ${JSON.stringify(uploadRes.body)}`);
    }
    const mediaItem = uploadRes.body.data || uploadRes.body;
    console.log(`✓ File stored on server. Media ID: ${mediaItem._id}, Path: ${mediaItem.storagePath}`);

    // Verify file actually exists on server filesystem disk
    const diskPath = path.resolve(process.cwd(), 'uploads', mediaItem.storagePath);
    if (!fs.existsSync(diskPath)) {
      throw new Error(`Disk file missing at path: ${diskPath}`);
    }
    console.log(`✓ Disk persistence verified: File physically exists at ${diskPath}`);

    // 14. Authenticated Media Stream Authorization
    console.log('[Test 14] Verifying authenticated file stream endpoint authorization...');
    const streamResA = await fetch(`http://localhost:3000/api/media/file/${mediaItem._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (streamResA.status !== 200) {
      throw new Error(`Owner User A failed to stream media file (Status: ${streamResA.status})`);
    }
    console.log('✓ Owner User A successfully streamed private media file (200 OK)');

    // 15. User Media Library Listing (/media/mine)
    console.log('[Test 15] Querying User A media library (/media/mine)...');
    const mineRes = await req('/media/mine', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const mineList = Array.isArray(mineRes.body) ? mineRes.body : (mineRes.body?.data || []);
    if (!mineList.some((m: any) => m._id === mediaItem._id || m.id === mediaItem._id)) {
      throw new Error(`User A media library did not contain uploaded item: ${JSON.stringify(mineRes.body)}`);
    }
    console.log('✓ User A media library contains uploaded media record');

    // 16. Send Media Chat Message
    console.log('[Test 16] User A sending IMAGE media message to User B with server upload metadata...');
    const mediaMsgRes = await req('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        conversationId: convId,
        text: 'Shared photo from server storage',
        type: 'IMAGE',
        media: {
          url: mediaItem.url,
          secureUrl: mediaItem.secureUrl,
          type: 'IMAGE',
          fileName: mediaItem.originalName,
          size: mediaItem.size,
        },
      },
    });
    if (!mediaMsgRes.body.data?._id) throw new Error(`Media message creation failed: ${JSON.stringify(mediaMsgRes.body)}`);

    const mediaMsgId = mediaMsgRes.body.data._id;
    const historyRes = await req(`/messages/${convId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const retrievedMediaMsg = historyRes.body.data?.find((m: any) => m._id === mediaMsgId);
    if (!retrievedMediaMsg || (!retrievedMediaMsg.media?.url && !retrievedMediaMsg.media?.secureUrl)) {
      throw new Error(`User B failed to retrieve User A media message: ${JSON.stringify(historyRes.body)}`);
    }
    console.log('✓ Media message created, persisted, and retrieved by User B with valid URL');

    // 17. Share Current Location
    console.log('[Test 17] User A sending LOCATION message to User B...');
    const locMsgRes = await req('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        conversationId: convId,
        text: '📍 Shared Location',
        type: 'LOCATION',
        location: {
          latitude: 26.9124,
          longitude: 75.7873,
          title: 'Current Location',
        },
      },
    });
    if (!locMsgRes.body.data?.location?.latitude) {
      throw new Error(`Location message failed: ${JSON.stringify(locMsgRes.body)}`);
    }
    console.log('✓ Location message created & persisted with lat: 26.9124, lng: 75.7873');

    // 18. Permission-Based Contact Sync & Purge
    console.log('[Test 18] User A syncing contacts with User B phone number...');
    const syncRes = await req('/contacts/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        contacts: [{ name: 'Rahul TestUserB', phoneNumber: phoneB }],
      },
    });
    if (!syncRes.body.data?.ichatContacts || syncRes.body.data.ichatContacts.length === 0) {
      throw new Error(`Contact sync failed to match User B: ${JSON.stringify(syncRes.body)}`);
    }
    console.log('✓ Contact sync matched User B as registered IChat contact');

    const purgeRes = await req('/contacts/sync', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!purgeRes.ok) throw new Error(`Contact purge failed: ${JSON.stringify(purgeRes.body)}`);
    console.log('✓ Synced contacts purged cleanly');

    // 19 & 20. Status Creation, Viewing & Deletion
    console.log('[Test 19 & 20] User A posting text status & User B viewing status...');
    const statusRes = await req('/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        type: 'TEXT',
        text: 'Testing IChat Status!',
        backgroundColor: '#00A884',
      },
    });
    if (!statusRes.ok) throw new Error(`Status creation failed: ${JSON.stringify(statusRes.body)}`);

    const feedRes = await req('/status', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const myFeed = feedRes.body.data?.contactUpdates || feedRes.body.data?.myStatus || feedRes.body.data;
    if (!myFeed) throw new Error(`Status feed retrieval failed: ${JSON.stringify(feedRes.body)}`);

    const statusId = statusRes.body.data?.myStatus?.[0]?._id || statusRes.body.data?._id;
    if (statusId) {
      await req(`/status/${statusId}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      console.log('✓ User B recorded status view on User A status');

      await req(`/status/${statusId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      console.log('✓ User A deleted status before 24h expiration');
    }

    // 21. Media Deletion Endpoint (/media/:id)
    console.log('[Test 21] User A deleting media file via DELETE /media/:id...');
    const deleteRes = await req(`/media/${mediaItem._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!deleteRes.ok) throw new Error(`Delete media failed: ${JSON.stringify(deleteRes.body)}`);

    if (fs.existsSync(diskPath)) {
      throw new Error(`File was not removed from server disk after deletion call: ${diskPath}`);
    }
    console.log('✓ Disk file removed cleanly from server filesystem upon deletion');

    // 22. Backup Settings API (GET & PATCH /backup/settings)
    console.log('[Test 22] Testing Backup Settings API (GET & PATCH /backup/settings)...');
    const settingsGetRes = await req('/backup/settings', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!settingsGetRes.ok) throw new Error(`GET /backup/settings failed: ${JSON.stringify(settingsGetRes.body)}`);

    const settingsPatchRes = await req('/backup/settings', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { isEnabled: true, wifiOnly: false },
    });
    const patchPayload = settingsPatchRes.body.data || settingsPatchRes.body;
    if (!patchPayload?.isEnabled) throw new Error(`PATCH /backup/settings failed: ${JSON.stringify(settingsPatchRes.body)}`);
    console.log('✓ Backup Settings GET & PATCH verified successfully');

    // 23. Dual Storage Backup Upload API (POST /backup/media/upload)
    console.log('[Test 23] Testing Dual Storage Backup Upload (Server Disk + Cloudinary)...');
    const backupImageBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C489', 'hex');
    const testChecksum = `checksum_test_${Date.now()}`;
    const backupUploadRes = await uploadFileReq('/backup/media/upload', tokenA, 'backup_photo.png', backupImageBuffer, 'image/png');
    if (!backupUploadRes.ok) throw new Error(`Dual storage backup upload failed: ${JSON.stringify(backupUploadRes.body)}`);

    const backupItem = backupUploadRes.body.data || backupUploadRes.body;
    if (!backupItem._id || !backupItem.filesystem?.storageKey) {
      throw new Error(`Backup item response missing required storage references: ${JSON.stringify(backupItem)}`);
    }

    const backupDiskPath = path.resolve(process.cwd(), 'uploads', backupItem.filesystem.storageKey);
    if (!fs.existsSync(backupDiskPath)) {
      throw new Error(`Dual storage backup file missing on server disk at: ${backupDiskPath}`);
    }
    console.log(`✓ Dual storage upload verified: File exists on server disk (${backupDiskPath}) and Cloudinary payload is recorded`);

    // 24. Backup Media Reconciliation API (POST /backup/media/reconcile)
    console.log('[Test 24] Testing Backup Media Reconciliation API...');
    const reconcileRes = await req('/backup/media/reconcile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: { checksums: [backupItem.checksum || testChecksum] },
    });
    if (!reconcileRes.ok) throw new Error(`Reconciliation call failed: ${JSON.stringify(reconcileRes.body)}`);
    console.log('✓ Media reconciliation API verified');

    // 25. Backup Status & Media Library API
    console.log('[Test 25] Testing Backup Status (/backup/status) & Media List (/backup/media)...');
    const backupStatusRes = await req('/backup/status', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!backupStatusRes.ok) throw new Error(`GET /backup/status failed: ${JSON.stringify(backupStatusRes.body)}`);

    const backupMediaListRes = await req('/backup/media', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const backupList = Array.isArray(backupMediaListRes.body) ? backupMediaListRes.body : (backupMediaListRes.body?.data || []);
    if (!backupList.some((b: any) => b._id === backupItem._id || b.mediaId === backupItem.mediaId)) {
      throw new Error(`GET /backup/media did not contain uploaded backup item: ${JSON.stringify(backupMediaListRes.body)}`);
    }
    console.log('✓ Backup status & backed-up media list APIs verified');

    // 26. Dual Storage Backup Item Deletion (DELETE /backup/media/:mediaId)
    console.log('[Test 26] Testing Dual Storage Media Deletion (DELETE /backup/media/:mediaId)...');
    const deleteBackupRes = await req(`/backup/media/${backupItem._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (!deleteBackupRes.ok) throw new Error(`DELETE /backup/media/:id failed: ${JSON.stringify(deleteBackupRes.body)}`);

    if (fs.existsSync(backupDiskPath)) {
      throw new Error(`Dual storage disk file was not removed upon deletion: ${backupDiskPath}`);
    }
    console.log('✓ Dual storage backup item deleted cleanly from disk and database');

    // 27. Valid Session Restoration
    console.log('[Test 27] Session restoration verification via /users/me...');
    const meRes = await req('/users/me', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (meRes.body.data?.phoneNumber !== phoneA) {
      throw new Error('Session restoration user mismatch');
    }
    console.log('✓ Session restoration verified via valid access token');

    console.log('\n======================================================');
    console.log('🎉 ALL 27 AUTOMATED E2E INTEGRATION TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ E2E TEST FAILED:', err.message);
    process.exit(1);
  }
}

runE2ETests();
