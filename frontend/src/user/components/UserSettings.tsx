import { useState } from 'react';
import { User } from '../App';
import { Settings, User as UserIcon, Bell, AlertTriangle, Upload, X, Lock, Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface UserSettingsProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onDeleteAccount: () => void;
}

export function UserSettings({
  user,
  onUpdateUser,
  onDeleteAccount,
}: UserSettingsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileData, setProfileData] = useState({
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    department: user.department,
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: user.emailNotifications,
    taskReminders: user.taskReminders,
  });
  const [profilePicture, setProfilePicture] = useState(user.profilePicture);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Show/hide password state
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // Force password change state
  const searchParams = new URLSearchParams(location.search);
  const isForcedPasswordChange = user.mustChangePassword === true || 
                                 searchParams.get('forcePasswordChange') === 'true';
  const [isPasswordChanged, setIsPasswordChanged] = useState(false);

  // Password strength function
  const getPasswordStrength = (password: string) => {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "25%" };
    if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "50%" };
    if (score === 3) return { label: "Good", color: "bg-blue-500", width: "75%" };
    return { label: "Strong", color: "bg-green-600", width: "100%" };
  };

  // Check if password is weak
  const strength = getPasswordStrength(passwordData.newPassword).label;
  const isWeakPassword = strength === "Weak";

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageUrl = reader.result as string;
      setProfilePicture(imageUrl);
      onUpdateUser({ profilePicture: imageUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteProfilePicture = () => {
    setProfilePicture(undefined);
    onUpdateUser({ profilePicture: undefined });
  };

  const handleSaveProfile = () => {
    onUpdateUser(profileData);
    setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
    setProfileData({
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      department: user.department,
    });
    setIsEditingProfile(false);
  };

  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    onUpdateUser(newPreferences);
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (isWeakPassword) {
      setPasswordError('Password is too weak. Please use a stronger password.');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/users/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.message || 'Failed to change password');
        return;
      }

      if (isForcedPasswordChange) {
        // For forced password changes
        setPasswordSuccess("Password updated. You will be logged out shortly.");
        setIsPasswordChanged(true);
        
        // Clear password fields
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        
        // Logout and redirect after delay
        setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/", { replace: true });
        }, 1500);
        
        return;
      } else {
        // Regular password change
        setPasswordSuccess('Password updated successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPasswordError('Server error. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    onDeleteAccount();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-gray-700" />
        <h2 className="text-gray-900">User Settings</h2>
      </div>

      {/* Force Password Change Banner */}
      {isForcedPasswordChange && !isPasswordChanged && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-yellow-800 font-medium">Password Change Required</h3>
          </div>
          <p className="text-yellow-700 text-sm">
            You must change your password before accessing other features.
          </p>
        </div>
      )}

      {/* Regular Settings Content (hidden during forced password change) */}
      {!isForcedPasswordChange || isPasswordChanged ? (
        <>
          {/* Profile Details Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gray-700" />
                <h3 className="text-gray-900">Profile Details</h3>
              </div>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
            <div className="p-6 space-y-6">
              {/* Profile Picture */}
              <div>
                <label className="block text-gray-700 mb-3">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                      <img
                        src={profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-12 h-12 text-gray-600" />
                    )}
                  </div>
                  {isEditingProfile && (
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors cursor-pointer">
                        <Upload className="w-4 h-4" />
                        Upload Picture
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          className="hidden"
                        />
                      </label>
                      {profilePicture && (
                        <button
                          onClick={handleDeleteProfilePicture}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Remove Picture
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 mb-2">User ID</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.userId}
                      onChange={(e) =>
                        setProfileData({ ...profileData, userId: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="text-gray-900">{user.userId}</div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Full Name</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) =>
                        setProfileData({ ...profileData, fullName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="text-gray-900">{user.fullName}</div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Email Address</label>
                  {isEditingProfile ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({ ...profileData, email: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="text-gray-900">{user.email}</div>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Phone Number</label>
                  {isEditingProfile ? (
                    <input
                      type="tel"
                      value={profileData.phoneNumber}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phoneNumber: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="text-gray-900">{user.phoneNumber}</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2">Department</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileData.department}
                      onChange={(e) =>
                        setProfileData({ ...profileData, department: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <div className="text-gray-900">{user.department}</div>
                  )}
                </div>
              </div>
              {isEditingProfile && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Security Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-700" />
              <h3 className="text-gray-900">Account Security</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="max-w-md space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Enter new password (min. 8 characters)"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {passwordData.newPassword && (
                    <div className="space-y-1 mt-2">
                      <div className="w-full h-2 bg-gray-200 rounded">
                        <div
                          className={`h-2 rounded transition-all duration-300 ${getPasswordStrength(passwordData.newPassword).color}`}
                          style={{ width: getPasswordStrength(passwordData.newPassword).width }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">
                        Strength: <strong className={getPasswordStrength(passwordData.newPassword).color.replace('bg-', 'text-')}>
                          {getPasswordStrength(passwordData.newPassword).label}
                        </strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-gray-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-600 text-sm">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-700 text-sm font-medium">
                      {passwordSuccess}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={isWeakPassword}
                  className={`px-6 py-2 rounded text-white transition-colors ${
                    isWeakPassword
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gray-800 hover:bg-gray-900"
                  }`}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>

          {/* System Preferences Section */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200 flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-700" />
              <h3 className="text-gray-900">System Preferences</h3>
            </div>
            <div className="p-6 space-y-6">
              {/* Email Notifications */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Email Notifications</div>
                  <div className="text-gray-600 text-sm">
                    Receive email updates for task assignments and status changes
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) =>
                      handlePreferenceChange('emailNotifications', e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-800"></div>
                </label>
              </div>

              {/* Task Reminders */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Task Reminders</div>
                  <div className="text-gray-600 text-sm">
                    Get reminders for upcoming deadlines through notifications at the top of
                    the website
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={preferences.taskReminders}
                    onChange={(e) =>
                      handlePreferenceChange('taskReminders', e.target.checked)
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gray-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-800"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="bg-white border border-red-300 rounded-lg">
            <div className="p-6 border-b border-red-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-gray-900">Danger Zone</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-gray-900 mb-1">Delete Account</div>
                  <div className="text-gray-600 text-sm">
                    Once you delete your account, there is no going back. Please be certain.
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors ml-4"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Delete Account Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-gray-900">Confirm Account Deletion</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-700 mb-4">
                    Are you absolutely sure you want to delete your account?
                  </p>
                  <p className="text-gray-900 mb-2">This action will:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4">
                    <li>Permanently delete your profile</li>
                    <li>Remove all your tasks and data</li>
                    <li>Cannot be undone</li>
                  </ul>
                  <p className="text-red-600">
                    This action is irreversible.
                  </p>
                </div>
                <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Yes, Delete My Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Show only password change form during forced password change */
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200 flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-700" />
            <h3 className="text-gray-900">Change Your Password</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="max-w-md space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Enter new password (min. 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {passwordData.newPassword && (
                  <div className="space-y-1 mt-2">
                    <div className="w-full h-2 bg-gray-200 rounded">
                      <div
                        className={`h-2 rounded transition-all duration-300 ${getPasswordStrength(passwordData.newPassword).color}`}
                        style={{ width: getPasswordStrength(passwordData.newPassword).width }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Strength: <strong className={getPasswordStrength(passwordData.newPassword).color.replace('bg-', 'text-')}>
                        {getPasswordStrength(passwordData.newPassword).label}
                      </strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-600 text-sm">{passwordError}</p>
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={isWeakPassword}
                className={`px-6 py-2 rounded text-white transition-colors ${
                  isWeakPassword ? "bg-gray-400 cursor-not-allowed" : "bg-gray-800 hover:bg-gray-900"
                }`}
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}