import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AdminApp from "./admin/AdminApp";
import UserApp from "./user/UserApp";
import { Login } from "./user/components/Login";
import { ForgotPasswordChange } from "./user/components/ForgotPasswordChange";

/**
 * MAIN APPLICATION ROOT COMPONENT
 * Entry point for the entire application with routing configuration.
 * Handles role-based navigation after authentication:
 * - Admin users → /admin/dashboard
 * - Regular users → /user/dashboard
 * - Forced password change flow → /forgot-password-change
 * - Catch-all redirect to login page
 */

function App() {
  const navigate = useNavigate();

  const handleLogin = (_email: string, _password: string) => {
    // Login already saved token + user in Login.tsx
    const user = JSON.parse(localStorage.getItem("user")!);

    if (user.role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/user/dashboard");
    }
  };

  const handleSignUp = () => {
    const user = JSON.parse(localStorage.getItem("user")!);

    if (user.role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/user/dashboard");
    }
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Login
            onLogin={handleLogin}
            onSignUp={handleSignUp}
          />
        }
      />
      <Route path="/user/*" element={<UserApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="/forgot-password-change" element={<ForgotPasswordChange />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;