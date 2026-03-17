// Authentication functions

// Sign Up
async function signUp(email, password, username, fullName) {
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
        });

        if (authError) throw authError;

        if (!authData.user) {
            throw new Error("No user returned after signup");
        }

        const userId = authData.user.id;
        const referralCode = generateReferralCode(username);

        const { error: insertError } = await supabaseClient
            .from('users')
            .insert({
                id: userId,
                email: email,
                username: username,
                full_name: fullName || null,
                referral_code: referralCode,
                wallet_balance: 0,
                mining_power: 0,
                email_verified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (insertError) {
            console.error("Profile insert failed:", insertError.message, insertError.details);
            // For dev: continue anyway (user is still logged in)
        } else {
            console.log("Profile row created OK");
        }

        await createNotification(
            userId,
            'Welcome to CryptoMine Pro!',
            'Thank you for joining. Start mining today!',
            'success'
        );

        return { success: true, user: authData.user };
    } catch (error) {
        console.error('Sign up failed:', error);
        return { success: false, error: error.message || String(error) };
    }
}

// Sign In
async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // Update last login
        await supabaseClient
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id);

        // Log activity
        await logActivity(data.user.id, 'user_login', { method: 'password' });

        return { success: true, user: data.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

// Sign Out
async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// === DEBUG VERSION - checkAuth ===
async function checkAuth() {
    console.log('🔐 checkAuth running...');
    const { data: { user } } = await supabaseClient.auth.getUser();
    console.log('Auth state:', user ? 'LOGGED IN' : 'NOT LOGGED IN');
    return user;
}

// Check Auth State
/*async function checkAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user && !window.location.pathname.includes('login.html') && 
        !window.location.pathname.includes('signup.html') && 
        !window.location.pathname.includes('index.html')) {
        window.location.href = 'login.html';
        return null;
    }
    
    if (user && window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
        return null;
    }
    
    return user;
}*/


// Generate Referral Code
function generateReferralCode(username) {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${username}_${randomStr}`;
}

// Reset Password
async function resetPassword(email) {
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });
        
        if (error) throw error;
        
        return { success: true, message: 'Password reset email sent' };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message };
    }
}

// Update Password
async function updatePassword(newPassword) {
    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        return { success: true, message: 'Password updated successfully' };
    } catch (error) {
        console.error('Update password error:', error);
        return { success: false, error: error.message };
    }
}


// === DEBUG VERSION - getUserProfile ===
async function getUserProfile() {
    console.log('🔍 getUserProfile started');
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        console.log('👤 Auth user:', user ? user.id : 'null');

        if (!user) {
            console.log('❌ No authenticated user');
            return null;
        }

        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        console.log('📊 Profile query result:', { data, error });

        if (error) {
            console.error('❌ Profile query error:', error);
            return null;
        }

        if (!data) {
            console.warn('⚠️ No profile row found in public.users – using fallback');
            return {
                id: user.id,
                email: user.email,
                username: username || 'NewUser',
                full_name: null,
                wallet_balance: 0,
                mining_power: 0,
                is_admin: false
            };
        }

        console.log('✅ Profile loaded successfully:', data);
        return data;
    } catch (err) {
        console.error('💥 getUserProfile crashed:', err);
        return null;
    }
}

// Get Current User Profile
/*async function getUserProfile() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) {
            console.warn('Profile fetch issue:', error.message);
            // PGRST116 = no rows → normal for new users sometimes
            if (error.code === 'PGRST116') {
                return {
                    id: user.id,
                    email: user.email,
                    username: 'NewUser',
                    full_name: null,
                    is_admin: false,
                    wallet_balance: 0,
                    mining_power: 0
                };
            }
            return null;
        }

        return data;
    } catch (err) {
        console.error('getUserProfile crashed:', err);
        return null;
    }
}*/

// Update User Profile
async function updateUserProfile(updates) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) throw new Error('Not authenticated');
        
        const { data, error } = await supabaseClient
            .from('users')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
            
        if (error) throw error;
        
        return { success: true, data };
    } catch (error) {
        console.error('Update profile error:', error);
        return { success: false, error: error.message };
    }
}

// Create Notification
async function createNotification(userId, title, message, type = 'info') {
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .insert([
                {
                    user_id: userId,
                    title: title,
                    message: message,
                    type: type,
                    created_at: new Date().toISOString()
                }
            ]);
            
        if (error) throw error;
    } catch (error) {
        console.error('Create notification error:', error);
    }
}

// Log Activity
async function logActivity(userId, action, details = {}) {
    try {
        const { error } = await supabaseClient
            .from('activity_logs')
            .insert([
                {
                    user_id: userId,
                    action: action,
                    ip_address: await getClientIP(),
                    user_agent: navigator.userAgent,
                    details: details,
                    created_at: new Date().toISOString()
                }
            ]);
            
        if (error) throw error;
    } catch (error) {
        console.error('Log activity error:', error);
    }
}

// Get Client IP (using ipify API)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Get IP error:', error);
        return null;
    }
}

// Initialize auth state check on page load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    
    // Update UI based on auth state
    if (user) {
        // User is logged in
        const profile = await getUserProfile();
        if (profile && profile.is_admin && window.location.pathname.includes('admin.html')) {
            // Load admin panel
            //loadAdminPanel();
        }
    }
});