import React, { FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import AuthPage from "./AuthPage";
import { AuthService } from "../../service/authService";
import { addToast } from "../../redux/slices/toasterSlice";
import { useDispatch } from "react-redux";
import Input from "../Reusable/Inputs/Input";
import Button from "../Reusable/Button";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUserNameError] = useState<string | undefined>(undefined);
  const [usernameHint, setUsernameHint] = useState<string | undefined>(undefined);
  const [usernameHintTone, setUsernameHintTone] = useState<"success" | "muted">("muted");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setUserNameError(undefined);
      setUsernameHint(undefined);
      setUsernameChecking(false);
      return;
    }

    setUsernameChecking(true);
    setUsernameHint("Checking availability...");
    setUsernameHintTone("muted");
    setUserNameError(undefined);

    usernameCheckTimer.current = setTimeout(async () => {
      try {
        await AuthService.getUsernameAvailibility(trimmed);
        setUserNameError(undefined);
        setUsernameHint("Username is available");
        setUsernameHintTone("success");
      } catch {
        setUsernameHint(undefined);
        setUserNameError("Username not available");
      } finally {
        setUsernameChecking(false);
      }
    }, 400);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (usernameChecking || usernameError) return;

    setLoading(true);
    try {
      const response = await AuthService.register({ fullName, username, email, password });
      if (response.data.success) {
        dispatch(addToast({ message: response?.data.message, type: "success", duration: 3000, position: "top-right" }));
        navigate("/");
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const usernameUnavailable = Boolean(usernameError) || usernameChecking;

  return (
    <AuthPage heading="Sign up" subheading="Create your account to get started">
      <form onSubmit={handleSubmit} className="w-full">
        <div className="mb-5 text-center">
          <h2 className="text-2xl font-bold text-text">Sign up</h2>
          <p className="mt-1 text-sm text-card-text">Lets Get Started</p>
        </div>

        <div className="grid gap-3">
          <Input
            name="fullName"
            label="Full Name"
            placeholder="Full Name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            name="username"
            label="Username"
            placeholder="Username"
            type="text"
            required
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            error={usernameError}
            hint={usernameHint}
            hintTone={usernameHintTone}
          />
          <Input
            name="email"
            label="Email"
            placeholder="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            name="password"
            label="Password"
            placeholder="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mt-6">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={loading}
            disabled={loading || usernameUnavailable}
          >
            Sign up
          </Button>
        </div>

        <div className="mt-4 flex flex-col items-center gap-1">
          <Button type="button" variant="link" className="mt-2">
            <Link to="/">Already registered? Log in</Link>
          </Button>
        </div>
      </form>
    </AuthPage>
  );
};

export default Register;
