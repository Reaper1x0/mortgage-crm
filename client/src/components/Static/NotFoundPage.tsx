import { Link } from "react-router";
import Button from "../Reusable/Button";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-text h-screen">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">The page you're looking for doesn't exist.</p>

      <Button variant="primary">
        <Link to="/">Go Back Home</Link>
      </Button>
    </div>
  );
}
