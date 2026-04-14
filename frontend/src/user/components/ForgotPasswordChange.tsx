import { useState } from "react";
import { Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * FORGOT PASSWORD CHANGE COMPONENT
 * Handles temporary password change flow when admin has reset a user's password.
 * Features include:
 * - Password visibility toggle for current password field
 * - Password validation (minimum 8 characters, match confirmation)
 * - API integration for password change
 * - Automatic logout and redirect to login after successful change
 * - Error and success message display
 */

export function ForgotPasswordChange() {
  const navigate = useNavigate();

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [show, setShow] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      const res = await fetch(
        "http://localhost:5000/api/users/change-password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to update password");
        return;
      }

      setSuccess("Password updated successfully. Redirecting to login...");

      // Clear session and redirect to login after successful password change
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
      }, 1500);
    } catch {
      setError("Server error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white border rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Lock className="text-gray-700" />
          <h2 className="text-gray-900">Change Temporary Password</h2>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-300 p-3 rounded flex gap-2">
          <AlertTriangle className="text-yellow-600 w-5 h-5 mt-0.5" />
          <p className="text-yellow-800 text-sm">
            Your password was reset by an administrator. You must create a new
            password to continue.
          </p>
        </div>

        {/* Current Password */}
        <div>
          <label className="block mb-1">Temporary Password</label>
          <div className="relative">
            <input
              type={show.current ? "text" : "password"}
              className="w-full px-4 py-2 border rounded"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, currentPassword: e.target.value })
              }
            />
            <button
              type="button"
              onClick={() => setShow({ ...show, current: !show.current })}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {show.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block mb-1">New Password</label>
          <input
            type="password"
            className="w-full px-4 py-2 border rounded"
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block mb-1">Confirm New Password</label>
          <input
            type="password"
            className="w-full px-4 py-2 border rounded"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, confirmPassword: e.target.value })
            }
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 p-3 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}