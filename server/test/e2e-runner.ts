const BASE_URL = 'http://localhost:3000/api';

async function req(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
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

    // 13. Invalid Conversation ID Handling
    console.log('[Test 13] Verifying invalid conversation ID returns proper error...');
    const invalidRes = await req('/conversations/invalid_conv_id_123', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (invalidRes.status === 400 || invalidRes.status === 404) {
      console.log(`✓ Invalid conversation ID properly rejected (${invalidRes.status} Error)`);
    } else {
      throw new Error(`Invalid conversation ID did not throw expected error (Status: ${invalidRes.status})`);
    }

    // 14 & 15. Token Restoration & Session Verification
    console.log('[Test 14 & 15] Verifying session restoration via /users/me endpoint...');
    const meRes = await req('/users/me', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    if (meRes.body.data?.phoneNumber !== phoneA) {
      throw new Error('Session restoration user mismatch');
    }
    console.log('✓ Valid session restoration verified via token');

    console.log('\n======================================================');
    console.log('🎉 ALL 15 AUTOMATED E2E INTEGRATION TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\n❌ E2E TEST FAILED:', err.message);
    process.exit(1);
  }
}

runE2ETests();
