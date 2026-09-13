"use client";

import { useState } from "react";
import { PageShell, PageHeader, SectionCard, Btn, useToast } from "@/components/admin/Shared";

const TRIGGERS = [
  "Order completed",
  "Product purchased",
  "Cart abandoned",
  "Customer inactive",
  "Customer joins segment",
  "Product viewed",
  "Wishlist added"
];

const CONDITIONS = [
  "Customer type (VIP/Regular)",
  "Order value (>= threshold)",
  "Product category (Bedding/Runner)",
  "Number of orders (First-time/Repeat)",
  "Days since purchase (60d/90d)",
  "Customer segment cohort"
];

const ACTIONS = [
  "Send email campaign template",
  "Send WhatsApp message template",
  "Add customer to VIP segment",
  "Send ₹250 discount coupon",
  "Recommend related category products",
  "Notify store administrators"
];

interface JourneyNode {
  id: string;
  type: "trigger" | "condition" | "action" | "wait";
  label: string;
}

export default function JourneyBuilderPage() {
  const { addToast } = useToast();
  const [journeyName, setJourneyName] = useState("My Configured Customer Journey");
  const [trigger, setTrigger] = useState(TRIGGERS[0]);
  
  // Custom configured steps
  const [nodes, setNodes] = useState<JourneyNode[]>([
    { id: "node-1", type: "trigger", label: `Trigger: ${TRIGGERS[0]}` },
    { id: "node-2", type: "wait", label: "Wait 7 Days" },
    { id: "node-3", type: "condition", label: `Check: ${CONDITIONS[3]}` },
    { id: "node-4", type: "action", label: `Action: ${ACTIONS[3]}` }
  ]);

  const [selectedType, setSelectedType] = useState<"action" | "condition" | "wait">("action");
  const [selectedValue, setSelectedValue] = useState(ACTIONS[0]);

  function handleAddNode() {
    const labelText =
      selectedType === "wait"
        ? `Wait 14 Days`
        : selectedType === "condition"
        ? `Check: ${selectedValue}`
        : `Action: ${selectedValue}`;

    const newNode: JourneyNode = {
      id: "node-" + Date.now(),
      type: selectedType,
      label: labelText
    };

    setNodes([...nodes, newNode]);
    addToast("Step node appended to journey flowchart diagram.");
  }

  function handleRemoveNode(id: string) {
    setNodes(nodes.filter((n) => n.id !== id));
  }

  async function handleSaveJourney() {
    const res = await fetch("/api/admin/ai/journeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: journeyName, trigger, steps: nodes })
    });
    if (res.ok) {
      addToast("Customer Journey pathway saved and launched successfully.");
    }
  }

  return (
    <PageShell>
      <PageHeader title="Visual Customer Journey Builder" subtitle="Map out triggers, conditions, delays, and message action blocks." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Flow Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <SectionCard title="Visual Workflow Flowchart Diagram">
            <div className="bg-paper border border-stone/15 p-6 rounded-sm min-h-[400px] flex flex-col items-center justify-start space-y-5 relative">
              {nodes.map((node, idx) => (
                <div key={node.id} className="flex flex-col items-center w-full max-w-sm">
                  {/* Node Box */}
                  <div className={`w-full p-4 rounded-sm border shadow-sm relative flex items-center justify-between ${
                    node.type === "trigger"
                      ? "bg-indigo/5 border-indigo/20 text-indigo"
                      : node.type === "condition"
                      ? "bg-turmeric/5 border-turmeric/20 text-[#8a6519]"
                      : node.type === "wait"
                      ? "bg-stone/10 border-stone/20 text-ink"
                      : "bg-green-700/5 border-green-700/20 text-green-800"
                  }`}>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75">{node.type}</span>
                      <p className="text-xs font-semibold mt-1">{node.label}</p>
                    </div>
                    {node.type !== "trigger" && (
                      <button onClick={() => handleRemoveNode(node.id)} className="text-stone hover:text-madder text-xs shrink-0 pl-2">✕</button>
                    )}
                  </div>

                  {/* Flow Arrow */}
                  {idx < nodes.length - 1 && (
                    <div className="h-5 flex items-center justify-center">
                      <svg className="w-4 h-4 text-stone/40 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Configuration Column */}
        <div className="space-y-6">
          <SectionCard title="Journey Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone mb-1.5">Journey Name</label>
                <input
                  type="text"
                  value={journeyName}
                  onChange={(e) => setJourneyName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-xs text-ink focus:ring-1 focus:ring-madder"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone mb-1.5">Select trigger</label>
                <select
                  value={trigger}
                  onChange={(e) => {
                    setTrigger(e.target.value);
                    // Update trigger node label
                    setNodes(nodes.map((n) => n.type === "trigger" ? { ...n, label: `Trigger: ${e.target.value}` } : n));
                  }}
                  className="w-full px-3 py-2 border border-stone/30 bg-paper text-xs text-ink focus:ring-1 focus:ring-madder"
                >
                  {TRIGGERS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Add Workflow Step Node">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone mb-1.5">Node Type</label>
                <div className="flex gap-2">
                  {["action", "condition", "wait"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedType(t as any);
                        setSelectedValue(t === "condition" ? CONDITIONS[0] : ACTIONS[0]);
                      }}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase border rounded-sm ${
                        selectedType === t ? "bg-indigo border-indigo text-paper" : "border-stone/30 text-stone bg-paper"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {selectedType !== "wait" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone mb-1.5">Value Rule</label>
                  <select
                    value={selectedValue}
                    onChange={(e) => setSelectedValue(e.target.value)}
                    className="w-full px-3 py-2 border border-stone/30 bg-paper text-xs text-ink focus:ring-1 focus:ring-madder"
                  >
                    {(selectedType === "condition" ? CONDITIONS : ACTIONS).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}

              <Btn size="sm" type="button" onClick={handleAddNode} className="w-full">
                Add Step Node
              </Btn>
            </div>
          </SectionCard>

          <div className="flex justify-end gap-3 pt-2">
            <Btn onClick={handleSaveJourney} className="w-full">Publish Journey Pathway</Btn>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
