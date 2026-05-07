import { Link } from "react-router";

export default function UnauthorizedPage() {
  return (
    <section className="max-w-xl mx-auto py-16 px-4 text-center">
      <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
        Access denied
      </h1>
      <p className="mt-3 text-slate-600">
        You do not have permission to access this page with your current role.
      </p>
      <div className="mt-6">
        <Link
          to="/onboarding"
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </section>
  );
}
