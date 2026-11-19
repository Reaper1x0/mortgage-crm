import AppEntryGate from "./AppEntryGate";

/** Public auth pages; authenticated visitors are routed by AppEntryGate. */
export default function PublicRoute() {
  return <AppEntryGate />;
}
