import { useState } from 'react';
import { Admin } from '../../App';
import { User, Mail, Phone, Building, Save, Upload, X } from 'lucide-react';

interface AdminSettingsProps {
  admin: Admin;
  onUpdate: (admin: Admin) => void;
}

export function AdminSettings({ admin, onUpdate }: AdminSettingsProps) {
  const [formData, setFormData] = useState<Admin>({ ...admin });
  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePicture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePicture = () => {
    setFormData({ ...formData, profilePicture: undefined });
  };

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleCancel = () => {
    setFormData({ ...admin });
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Admin Settings</h2>
          <p className="text-gray-600">Manage your account information</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Success Message */}
      {saveMessage && (
        <div className="bg-red-600 text-white px-4 py-3 rounded-lg">
          {saveMessage}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="p-6 border-b border-gray-300 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="relative">
              {formData.profilePicture ? (
                <img
                  src={formData.profilePicture}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-800 text-white rounded-full flex items-center justify-center text-2xl">
                  {formData.name.charAt(0)}
                </div>
              )}
              {isEditing && (
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <label className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-700 transition-colors">
                    <Upload className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.profilePicture && (
                    <button
                      onClick={handleRemoveProfilePicture}
                      className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-gray-900">{formData.name}</h3>
              <p className="text-gray-600">{formData.email}</p>
              {isEditing && (
                <p className="text-gray-500 text-sm mt-1">Click the upload icon to change picture</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin ID */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Admin ID
              </label>
              <input
                type="text"
                value={formData.adminID}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
              />
              <p className="text-gray-500 text-sm mt-1">ID cannot be changed</p>
            </div>

            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  isEditing 
                    ? 'focus:outline-none focus:ring-2 focus:ring-red-500' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              />
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <Mail className="w-4 h-4" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  isEditing 
                    ? 'focus:outline-none focus:ring-2 focus:ring-red-500' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  isEditing 
                    ? 'focus:outline-none focus:ring-2 focus:ring-red-500' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              />
            </div>

            {/* Department */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-gray-700 mb-2">
                <Building className="w-4 h-4" />
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={!isEditing}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg ${
                  isEditing 
                    ? 'focus:outline-none focus:ring-2 focus:ring-red-500' 
                    : 'bg-gray-50 text-gray-700'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-gray-300">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="bg-white rounded-lg border border-gray-300 p-6">
        <h3 className="text-gray-900 mb-4">System Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-300">
            <div>
              <p className="text-gray-900">Email Notifications</p>
              <p className="text-gray-600 text-sm">Receive email updates for task assignments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-300">
            <div>
              <p className="text-gray-900">Project Reminders</p>
              <p className="text-gray-600 text-sm">Get reminders for upcoming deadlines</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}