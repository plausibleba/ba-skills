/**
 * ShareDialog — modal for managing project sharing.
 *
 * Features:
 *  - Email input with permission toggle (view/edit)
 *  - Current access list with revoke & permission change
 *  - Error handling for unknown emails, self-share, etc.
 */
import { useState, useEffect, useCallback } from "react";
import { useProjectStore, type AccessGrant } from "../store/project-store.ts";

interface ShareDialogProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ShareDialog({ projectId, projectName, onClose }: ShareDialogProps) {
  const { shareProject, fetchProjectAccess, updateAccess, revokeAccess } = useProjectStore();

  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("edit");
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshGrants = useCallback(async () => {
    setLoading(true);
    const data = await fetchProjectAccess(projectId);
    setGrants(data);
    setLoading(false);
  }, [projectId, fetchProjectAccess]);

  useEffect(() => {
    refreshGrants();
  }, [refreshGrants]);

  const handleShare = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSharing(true);
    setError(null);
    setSuccess(null);

    const result = await shareProject(projectId, trimmed, permission);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(`Shared with ${trimmed} (${permission})`);
      setEmail("");
      await refreshGrants();
    }
    setSharing(false);
  };

  const handleUpdatePermission = async (grant: AccessGrant, newPerm: "view" | "edit") => {
    const result = await updateAccess(grant.id, newPerm);
    if (result.error) {
      setError(result.error);
    } else {
      await refreshGrants();
    }
  };

  const handleRevoke = async (grant: AccessGrant) => {
    const result = await revokeAccess(grant.id);
    if (result.error) {
      setError(result.error);
    } else {
      setGrants((prev) => prev.filter((g) => g.id !== grant.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Share project</h3>
            <p className="text-xs text-gray-500 mt-0.5">{projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Share form */}
        <div className="px-5 py-4">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); setSuccess(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleShare()}
              placeholder="Email address"
              autoFocus
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-vcc-500 focus:outline-none focus:ring-1 focus:ring-vcc-500"
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "view" | "edit")}
              className="rounded-lg border border-gray-300 px-2 py-2 text-xs font-medium text-gray-700 focus:border-vcc-500 focus:outline-none"
            >
              <option value="edit">Can edit</option>
              <option value="view">Can view</option>
            </select>
            <button
              onClick={handleShare}
              disabled={!email.trim() || sharing}
              className="rounded-lg bg-vcc-600 px-4 py-2 text-sm font-semibold text-white hover:bg-vcc-700 disabled:opacity-50"
            >
              {sharing ? "..." : "Share"}
            </button>
          </div>

          {/* Feedback */}
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
          {success && (
            <p className="mt-2 text-xs text-green-600">{success}</p>
          )}
        </div>

        {/* Current access list */}
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            People with access
          </p>

          {loading ? (
            <p className="py-2 text-xs text-gray-400">Loading...</p>
          ) : grants.length === 0 ? (
            <p className="py-2 text-xs text-gray-400">Not shared with anyone yet.</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {grants.map((grant) => (
                <div key={grant.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-900">
                      {grant.display_name || grant.email}
                    </p>
                    {grant.display_name && (
                      <p className="truncate text-[10px] text-gray-400">{grant.email}</p>
                    )}
                  </div>
                  <div className="ml-3 flex items-center gap-1.5">
                    <select
                      value={grant.permission}
                      onChange={(e) => handleUpdatePermission(grant, e.target.value as "view" | "edit")}
                      className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 focus:outline-none"
                    >
                      <option value="edit">Can edit</option>
                      <option value="view">Can view</option>
                    </select>
                    <button
                      onClick={() => handleRevoke(grant)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Remove access"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-3">
          <p className="text-[10px] text-gray-400">
            Shared users must have a PlausibleBA account. They'll see this project in their "Shared with me" list.
          </p>
        </div>
      </div>
    </div>
  );
}
