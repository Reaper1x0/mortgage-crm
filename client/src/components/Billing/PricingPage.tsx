import { useEffect, useState } from "react";
import Segmented from "../Reusable/Segmented";
import PlanCard from "../Reusable/PlanCard";
import { BillingCycle, BillingService, Plan } from "../../service/billingService";

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const rows = await BillingService.listPublicPlans();
        setPlans(rows);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  const onStartCheckout = async (planId: string) => {
    const payload = await BillingService.createCheckoutSession(planId, cycle);
    if (payload?.checkoutUrl) {
      window.location.href = payload.checkoutUrl;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Pricing</h1>
          <p className="text-sm text-card-text">Choose the right plan for your organization.</p>
        </div>
        <Segmented
          value={cycle}
          onChange={(value) => setCycle(value as BillingCycle)}
          options={[
            { key: "monthly", label: "Monthly" },
            { key: "yearly", label: "Yearly" },
          ]}
        />
      </div>

      {loading ? <div className="text-sm text-card-text">Loading plans...</div> : null}
      {!loading && plans.length === 0 ? <div className="text-sm text-card-text">No plans available.</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan._id}
            name={plan.name}
            description={plan.description}
            recommended={plan.recommended}
            pricing={plan.pricing}
            billingCycle={cycle}
            entitlements={plan.entitlements}
            onAction={() => void onStartCheckout(plan._id)}
            actionLabel={`Choose ${plan.name}`}
          />
        ))}
      </div>
    </div>
  );
}
