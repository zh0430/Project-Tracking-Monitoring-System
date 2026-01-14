import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AdminApp from "./admin/AdminApp";
import UserApp from "./user/UserApp";
import { Login } from "./user/components/Login";

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
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
