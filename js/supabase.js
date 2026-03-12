const supabaseUrl = 'https://qhldwtomffnaumezhhvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobGR3dG9tZmZuYXVtZXpoaHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MjI4NDIsImV4cCI6MjA4ODM5ODg0Mn0.x1FUN_ouEdLmoftMA81XNKDp_RjUBCFNd_uEOz_Eedc';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

const THEMES = {
    pink: { name: 'Cherry Blossom', color: '#FF2D55' },
    blue: { name: 'Ocean Breeze', color: '#007AFF' },
    green: { name: 'Mint Leaf', color: '#34C759' },
    purple: { name: 'Lavender Night', color: '#AF52DE' },
};

function generatePairCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function signUp(email, password, name) {
    const pairCode = generatePairCode();

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Sign up failed');

    const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{ id: authData.user.id, email, name, pair_code: pairCode }]);

    if (profileError) throw profileError;

    return {
        id: authData.user.id,
        email,
        name,
        pairCode,
    };
}

async function signIn(email, password) {
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Sign in failed');

    const profile = await getUserProfile(authData.user.id);
    if (!profile) throw new Error('User profile not found');

    return profile;
}

async function signOut() {
    await supabaseClient.auth.signOut();
}

function onAuthChange(callback) {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        callback(session?.user || null);
    });
    return () => subscription.unsubscribe();
}

async function getUserProfile(uid) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        email: data.email,
        name: data.name,
        pairCode: data.pair_code,
        partnerId: data.partner_id,
    };
}

function subscribeUser(uid, callback) {
    const channel = supabaseClient
        .channel(`profile:${uid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
        async (payload) => {
            const data = payload.new;
            callback({
                id: data.id,
                email: data.email,
                name: data.name,
                pairCode: data.pair_code,
                partnerId: data.partner_id,
            });
        })
        .subscribe();

    return () => {
        supabaseClient.removeChannel(channel);
    };
}

async function pairWithCode(userId, code) {
    const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '');

    const { data: target, error: searchError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('pair_code', normalizedCode)
        .neq('id', userId)
        .single();

    if (searchError || !target) return null;

    const { error: update1 } = await supabaseClient.from('profiles').update({ partner_id: target.id }).eq('id', userId);
    const { error: update2 } = await supabaseClient.from('profiles').update({ partner_id: userId }).eq('id', target.id);

    if (update1 || update2) throw new Error('Failed to update pairing');

    return {
        id: target.id,
        email: target.email,
        name: target.name,
        pairCode: target.pair_code,
        partnerId: userId,
    };
}

async function uploadMemoryFile(userId, memoryId, type, file) {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${userId}/${memoryId}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
        .from('memories')
        .upload(path, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage.from('memories').getPublicUrl(path);
    return publicUrl;
}

async function createMemory(memory) {
    const { data, error } = await supabaseClient
        .from('memories')
        .insert([{
            user_id: memory.userId,
            partner_id: memory.partnerId,
            type: memory.type,
            title: memory.title,
            description: memory.description,
            uri: memory.uri,
        }])
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id,
        userId: data.user_id,
        partnerId: data.partner_id,
        type: data.type,
        title: data.title,
        description: data.description,
        uri: data.uri,
        createdAt: new Date(data.created_at).getTime(),
    };
}

async function deleteMemory(memoryId, userId) {
    const { error } = await supabaseClient
        .from('memories')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', userId);

    if (error) throw error;
}

function subscribeMemories(userId, partnerId, callback) {
    const ids = partnerId ? [userId, partnerId] : [userId];

    supabaseClient
        .from('memories')
        .select('*')
        .in('user_id', ids)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
            if (data) {
                callback(data.map(d => ({
                    id: d.id,
                    userId: d.user_id,
                    partnerId: d.partner_id,
                    type: d.type,
                    title: d.title,
                    description: d.description,
                    uri: d.uri,
                    createdAt: new Date(d.created_at).getTime(),
                })));
            }
        });

    const channel = supabaseClient
        .channel('memories-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'memories' }, () => {
            supabaseClient
                .from('memories')
                .select('*')
                .in('user_id', ids)
                .order('created_at', { ascending: false })
                .then(({ data }) => {
                    if (data) {
                        callback(data.map(d => ({
                            id: d.id,
                            userId: d.user_id,
                            partnerId: d.partner_id,
                            type: d.type,
                            title: d.title,
                            description: d.description,
                            uri: d.uri,
                            createdAt: new Date(d.created_at).getTime(),
                        })));
                    }
                });
        })
        .subscribe();

    return () => {
        supabaseClient.removeChannel(channel);
    };
}

async function sendMessage(msg) {
    const conversationId = [msg.fromUserId, msg.toUserId].sort().join('_');
    const { error } = await supabaseClient.from('messages').insert([{
        from_user_id: msg.fromUserId,
        to_user_id: msg.toUserId,
        text: msg.text,
        conversation_id: conversationId,
    }]);
    if (error) throw error;
}

function subscribeMessages(userId, partnerId, callback) {
    const conversationId = [userId, partnerId].sort().join('_');

    supabaseClient
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
            if (data) {
                callback(data.map(d => ({
                    id: d.id,
                    fromUserId: d.from_user_id,
                    toUserId: d.to_user_id,
                    text: d.text,
                    createdAt: new Date(d.created_at).getTime(),
                })));
            }
        });

    const channel = supabaseClient
        .channel(`chat:${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
            supabaseClient
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                    if (data) {
                        callback(data.map(d => ({
                            id: d.id,
                            fromUserId: d.from_user_id,
                            toUserId: d.to_user_id,
                            text: d.text,
                            createdAt: new Date(d.created_at).getTime(),
                        })));
                    }
                });
        })
        .subscribe();

    return () => {
        supabaseClient.removeChannel(channel);
    };
}
