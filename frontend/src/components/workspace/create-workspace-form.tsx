"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Briefcase,
  Globe,
  Laptop,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

import { authRepository } from "@/repositories/auth.repository";
import { useAuthStore } from "@/store/auth.store";
import { useWorkspaceStore } from "@/store/workspace.store";
import type { WorkspaceRead } from "@/types/auth";

export const INDUSTRY_PRESETS = [
  {
    id: "saas",
    label: "SaaS & Software",
    desc: "Feature requests, UX issues & bugs",
    icon: Laptop,
  },
  {
    id: "ecommerce",
    label: "E-Commerce",
    desc: "Shipping, product quality & checkout",
    icon: ShoppingBag,
  },
  {
    id: "subscription",
    label: "Subscriptions",
    desc: "Retention, cancellations & pricing",
    icon: Globe,
  },
  {
    id: "service",
    label: "Services & Agency",
    desc: "Client satisfaction & deliverables",
    icon: Briefcase,
  },
] as const;

export const workspaceCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Workspace name is required")
    .max(255, "Name is too long"),
  industry: z.string().min(1, "Please select an industry preset"),
});

export type WorkspaceCreateFormData = z.infer<typeof workspaceCreateSchema>;

interface CreateWorkspaceFormProps {
  onSuccess?: (workspace: WorkspaceRead) => void;
}

export function CreateWorkspaceForm({ onSuccess }: CreateWorkspaceFormProps = {}) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<WorkspaceCreateFormData>({
    resolver: zodResolver(workspaceCreateSchema),
    defaultValues: { name: "", industry: "saas" },
  });

  const selectedIndustry = useWatch({ control, name: "industry" });

  const onSubmit = async (data: WorkspaceCreateFormData) => {
    setErrorMessage(null);
    try {
      const newWs = await authRepository.createWorkspace({
        name: data.name,
        industry: data.industry,
      });

      // Synchronize workspace & auth stores
      await useWorkspaceStore.getState().fetchWorkspaces();
      await useAuthStore.getState().fetchMe();

      toast.success(`Workspace "${newWs.name}" created!`);

      if (onSuccess) {
        onSuccess(newWs);
      } else {
        router.replace(`/${newWs.slug}/overview`);
      }
    } catch (err: unknown) {
      const message = (err as Error).message;
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-[10px] border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {errorMessage}
        </div>
      )}

      <div>
        <label
          htmlFor="ws_name"
          className="mb-1.5 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white"
        >
          Workspace name
        </label>
        <input
          id="ws_name"
          type="text"
          placeholder="e.g. Acme Corp or Linear Team"
          autoComplete="organization"
          disabled={isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "ws-name-error" : undefined}
          className="h-11 sm:h-12 w-full rounded-[10px] border border-[#E2E8F0] bg-white px-4 text-[14px] text-[#0F172A] placeholder-[#94A3B8] transition duration-150 focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#141416] dark:text-white dark:placeholder-[#636366]"
          {...register("name")}
        />
        {errors.name && (
          <p id="ws-name-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-[13px] sm:text-[14px] font-medium text-[#0F172A] dark:text-white">
          Industry preset
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INDUSTRY_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedIndustry === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setValue("industry", preset.id)}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-[#0071E3] bg-[#0071E3]/5 text-[#0071E3] shadow-xs dark:border-[#2997FF] dark:bg-[#2997FF]/10 dark:text-[#2997FF]"
                    : "border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-[#141416] dark:text-[#A1A1A6] dark:hover:border-white/20"
                }`}
              >
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold leading-tight text-[#0F172A] dark:text-white">
                    {preset.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-[#64748B] dark:text-[#8E8E93]">
                    {preset.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {errors.industry && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {errors.industry.message}
          </p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-11 sm:h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#0071E3] text-[14px] sm:text-[15px] font-medium text-white shadow-sm transition duration-150 hover:bg-[#0062C4] hover:shadow active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Creating workspace…</span>
            </>
          ) : (
            "Create Workspace"
          )}
        </button>
      </div>
    </form>
  );
}

