"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/useToast";
import { useHookSpecs } from "@/hooks/useHookSpecs";
import { useHooks } from "@/hooks/useHooks";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import { Button } from "@opal/components";
import { Disabled } from "@opal/core";
import InputSearch from "@/refresh-components/inputs/InputSearch";
import Card from "@/refresh-components/cards/Card";
import Text from "@/refresh-components/texts/Text";
import {
  SvgArrowExchange,
  SvgBubbleText,
  SvgCheckCircle,
  SvgExternalLink,
  SvgFileBroadcast,
  SvgHookNodes,
  SvgRefreshCw,
  SvgSettings,
  SvgXCircle,
} from "@opal/icons";
import { IconFunctionComponent } from "@opal/types";
import HookFormModal from "@/refresh-pages/admin/HooksPage/HookFormModal";
import type {
  HookPointMeta,
  HookResponse,
} from "@/refresh-pages/admin/HooksPage/interfaces";
import {
  activateHook,
  deactivateHook,
} from "@/refresh-pages/admin/HooksPage/svc";

const HOOK_POINT_ICONS: Record<string, IconFunctionComponent> = {
  document_ingestion: SvgFileBroadcast,
  query_processing: SvgBubbleText,
};

function getHookPointIcon(hookPoint: string): IconFunctionComponent {
  return HOOK_POINT_ICONS[hookPoint] ?? SvgHookNodes;
}

// ---------------------------------------------------------------------------
// Sub-component: connected hook card
// ---------------------------------------------------------------------------

interface ConnectedHookCardProps {
  hook: HookResponse;
  spec: HookPointMeta | undefined;
  onEdit: () => void;
  onDeleted: () => void;
  onToggled: (updated: HookResponse) => void;
}

function ConnectedHookCard({
  hook,
  spec,
  onEdit,
  onDeleted: _onDeleted,
  onToggled,
}: ConnectedHookCardProps) {
  const [isBusy, setIsBusy] = useState(false);

  async function handleToggle() {
    setIsBusy(true);
    try {
      const updated = hook.is_active
        ? await deactivateHook(hook.id)
        : await activateHook(hook.id);
      onToggled(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update hook status."
      );
    } finally {
      setIsBusy(false);
    }
  }

  const HookIcon = getHookPointIcon(hook.hook_point);

  return (
    <Card variant="primary" padding={0.5} gap={0}>
      <div className="flex flex-row items-start w-full">
        {/* Left: manually replicate ContentMd main-content layout so the docs
            link sits as a natural third line with zero artificial gap. */}
        <div className="flex flex-row flex-1 min-w-0 items-start gap-1 p-2">
          <div className="shrink-0 p-0.5 text-text-04">
            <HookIcon style={{ width: "1rem", height: "1rem" }} />
          </div>
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span
              className="font-main-ui-action text-text-04"
              style={{ height: "1.25rem" }}
            >
              {hook.name}
            </span>
            {/* matches opal-content-md-description: font-secondary-body px-[0.125rem] */}
            <div className="font-secondary-body text-text-03">
              {`Hook Point: ${spec?.display_name ?? hook.hook_point}`}
            </div>
            {spec?.docs_url && (
              <div className="font-secondary-body text-text-03">
                <a
                  href={spec.docs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 w-fit"
                >
                  <span className="underline">Documentation</span>
                  <SvgExternalLink size={12} className="shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: status + actions, top-aligned */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1 p-2">
            <span className="font-main-ui-action text-text-03">
              {hook.is_active ? "Connected" : "Inactive"}
            </span>
            {hook.is_active ? (
              <SvgCheckCircle size={16} className="text-status-success-05" />
            ) : (
              <SvgXCircle size={16} className="text-text-03" />
            )}
          </div>
          <div className="flex items-center gap-0.5 pl-2 pr-0.5">
            <Disabled disabled={isBusy}>
              <Button
                prominence="tertiary"
                size="md"
                icon={SvgRefreshCw}
                onClick={handleToggle}
                tooltip={hook.is_active ? "Deactivate" : "Activate"}
                aria-label={
                  hook.is_active ? "Deactivate hook" : "Activate hook"
                }
              />
            </Disabled>
            <Disabled disabled={isBusy}>
              <Button
                prominence="tertiary"
                size="md"
                icon={SvgSettings}
                onClick={onEdit}
                aria-label="Configure hook"
              />
            </Disabled>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HooksContent() {
  const [search, setSearch] = useState("");
  const [connectSpec, setConnectSpec] = useState<HookPointMeta | null>(null);
  const [editHook, setEditHook] = useState<HookResponse | null>(null);

  const { specs, isLoading: specsLoading, error: specsError } = useHookSpecs();
  const {
    hooks,
    isLoading: hooksLoading,
    error: hooksError,
    mutate,
  } = useHooks();

  useEffect(() => {
    if (specsError) toast.error("Failed to load hook specifications.");
  }, [specsError]);

  useEffect(() => {
    if (hooksError) toast.error("Failed to load hooks.");
  }, [hooksError]);

  if (specsLoading || hooksLoading) {
    return <SimpleLoader />;
  }

  if (specsError) {
    return (
      <Text text03 secondaryBody>
        Failed to load hook specifications. Please refresh the page.
      </Text>
    );
  }

  const hooksByPoint: Record<string, HookResponse[]> = {};
  for (const hook of hooks ?? []) {
    (hooksByPoint[hook.hook_point] ??= []).push(hook);
  }

  const searchLower = search.toLowerCase();

  // Connected hooks sorted alphabetically by hook name
  const connectedHooks = (hooks ?? [])
    .filter(
      (hook) =>
        !searchLower ||
        hook.name.toLowerCase().includes(searchLower) ||
        (hooksByPoint[hook.hook_point] &&
          specs
            ?.find((s) => s.hook_point === hook.hook_point)
            ?.display_name.toLowerCase()
            .includes(searchLower))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  // Unconnected hook point specs sorted alphabetically
  const unconnectedSpecs = (specs ?? [])
    .filter(
      (spec) =>
        (hooksByPoint[spec.hook_point]?.length ?? 0) === 0 &&
        (!searchLower ||
          spec.display_name.toLowerCase().includes(searchLower) ||
          spec.description.toLowerCase().includes(searchLower))
    )
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  function handleHookSuccess(updated: HookResponse) {
    mutate((prev) => {
      if (!prev) return [updated];
      const idx = prev.findIndex((h) => h.id === updated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }

  function handleHookDeleted(id: number) {
    mutate((prev) => prev?.filter((h) => h.id !== id));
  }

  const connectSpec_ =
    connectSpec ??
    (editHook
      ? specs?.find((s) => s.hook_point === editHook.hook_point)
      : undefined);

  return (
    <>
      <div className="flex flex-col gap-6">
        <InputSearch
          placeholder="Search hooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          {connectedHooks.length === 0 && unconnectedSpecs.length === 0 ? (
            <Text text03 secondaryBody>
              {search
                ? "No hooks match your search."
                : "No hook points are available."}
            </Text>
          ) : (
            <>
              {connectedHooks.map((hook) => {
                const spec = specs?.find(
                  (s) => s.hook_point === hook.hook_point
                );
                return (
                  <ConnectedHookCard
                    key={hook.id}
                    hook={hook}
                    spec={spec}
                    onEdit={() => setEditHook(hook)}
                    onDeleted={() => handleHookDeleted(hook.id)}
                    onToggled={handleHookSuccess}
                  />
                );
              })}
              {unconnectedSpecs.map((spec) => {
                const UnconnectedIcon = getHookPointIcon(spec.hook_point);
                return (
                  <Card
                    key={spec.hook_point}
                    variant="secondary"
                    padding={0.5}
                    gap={0}
                  >
                    <div className="flex flex-row items-start w-full">
                      <div className="flex flex-row flex-1 min-w-0 items-start gap-1 p-2">
                        <div className="shrink-0 p-0.5 text-text-04">
                          <UnconnectedIcon
                            style={{ width: "1rem", height: "1rem" }}
                          />
                        </div>
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span
                            className="font-main-ui-action text-text-04"
                            style={{ height: "1.25rem" }}
                          >
                            {spec.display_name}
                          </span>
                          <div className="font-secondary-body text-text-03">
                            {spec.description}
                          </div>
                          {spec.docs_url && (
                            <div className="font-secondary-body text-text-03">
                              <a
                                href={spec.docs_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 w-fit"
                              >
                                <span className="underline">Documentation</span>
                                <SvgExternalLink
                                  size={12}
                                  className="shrink-0"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 p-2 cursor-pointer"
                        onClick={() => setConnectSpec(spec)}
                      >
                        <span className="font-main-ui-action text-text-03">
                          Connect
                        </span>
                        <SvgArrowExchange
                          size={16}
                          className="text-text-03 shrink-0"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Create modal */}
      <HookFormModal
        open={!!connectSpec}
        onOpenChange={(open) => {
          if (!open) setConnectSpec(null);
        }}
        spec={connectSpec ?? undefined}
        onSuccess={handleHookSuccess}
      />

      {/* Edit modal */}
      <HookFormModal
        open={!!editHook}
        onOpenChange={(open) => {
          if (!open) setEditHook(null);
        }}
        hook={editHook ?? undefined}
        spec={connectSpec_ ?? undefined}
        onSuccess={handleHookSuccess}
      />
    </>
  );
}
