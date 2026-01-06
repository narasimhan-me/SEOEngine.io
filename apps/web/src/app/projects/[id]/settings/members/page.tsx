'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { isAuthenticated } from '@/lib/auth';
import {
  projectsApi,
  getRoleDisplayLabel,
  getRoleCapabilities,
} from '@/lib/api';
import type {
  ProjectMember,
  EffectiveProjectRole,
} from '@/lib/api';
import { useFeedback } from '@/components/feedback/FeedbackProvider';

/**
 * [ROLES-3] Members Management Page
 * [ROLES-3 FIXUP-2] Updated wording to remove "invite" language
 *
 * Allows project owners to:
 * - View all project members and their roles
 * - Add existing users by email (no invitations in ROLES-3)
 * - Change member roles
 * - Remove members
 *
 * Only OWNER role can manage members.
 * All other roles see a read-only list.
 */
export default function MembersPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const feedback = useFeedback();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [userRole, setUserRole] = useState<EffectiveProjectRole | null>(null);

  // Add member form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [adding, setAdding] = useState(false);

  // Role change state
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);

  // Remove member state
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [projectData, membersData, roleData] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.listMembers(projectId),
        projectsApi.getUserRole(projectId),
      ]);

      setProjectName(projectData.name);
      setMembers(membersData);
      setUserRole(roleData.role);
    } catch (err: unknown) {
      console.error('Error fetching members data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;

    try {
      setAdding(true);
      await projectsApi.addMember(projectId, addEmail.trim(), addRole);
      feedback.showSuccess(`Added ${addEmail} as ${getRoleDisplayLabel(addRole)}`);
      setAddEmail('');
      setShowAddForm(false);
      await fetchData();
    } catch (err: unknown) {
      console.error('Error adding member:', err);
      const message = err instanceof Error ? err.message : 'Failed to add member';
      feedback.showError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: EffectiveProjectRole) => {
    try {
      setChangingRoleFor(memberId);
      await projectsApi.changeMemberRole(projectId, memberId, newRole);
      feedback.showSuccess(`Role changed to ${getRoleDisplayLabel(newRole)}`);
      await fetchData();
    } catch (err: unknown) {
      console.error('Error changing role:', err);
      const message = err instanceof Error ? err.message : 'Failed to change role';
      feedback.showError(message);
    } finally {
      setChangingRoleFor(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      setRemovingMember(memberId);
      await projectsApi.removeMember(projectId, memberId);
      feedback.showSuccess('Member removed');
      await fetchData();
    } catch (err: unknown) {
      console.error('Error removing member:', err);
      const message = err instanceof Error ? err.message : 'Failed to remove member';
      feedback.showError(message);
    } finally {
      setRemovingMember(null);
    }
  };

  const canManageMembers = userRole ? getRoleCapabilities(userRole).canManageMembers : false;

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-600">Loading members...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-4 text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-gray-500">
          <li>
            <Link href="/projects" className="hover:text-gray-700">
              Projects
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/projects/${projectId}/store-health`} className="hover:text-gray-700">
              {projectName || 'Project'}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/projects/${projectId}/settings`} className="hover:text-gray-700">
              Settings
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900">Members</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-600">
            Manage who has access to this project and their permissions.
          </p>
          {userRole && (
            <p className="mt-1 text-xs text-gray-500">
              You are the {getRoleDisplayLabel(userRole)}
            </p>
          )}
        </div>
        {canManageMembers && (
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : 'Add member'}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Add member form */}
      {showAddForm && canManageMembers && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Add existing user</h2>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="EDITOR">Editor - Can generate drafts, request approvals</option>
                <option value="VIEWER">Viewer - Read-only access</option>
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !addEmail.trim()}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Members ({members.length})
          </h2>
        </div>
        {members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No members found. This shouldn&apos;t happen - at least the project owner should be listed.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                    {member.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.email || 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Joined {new Date(member.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {canManageMembers && member.role !== 'OWNER' ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value as EffectiveProjectRole)}
                      disabled={changingRoleFor === member.id}
                      className="rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.role === 'OWNER'
                          ? 'bg-purple-100 text-purple-800'
                          : member.role === 'EDITOR'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {getRoleDisplayLabel(member.role as EffectiveProjectRole)}
                    </span>
                  )}
                  {canManageMembers && member.role !== 'OWNER' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMember === member.id}
                      className="text-sm text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingMember === member.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Permissions reference */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Role permissions</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <h4 className="text-sm font-medium text-purple-800">Owner</h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>- Full project access</li>
              <li>- Generate and apply changes</li>
              <li>- Approve/reject requests</li>
              <li>- Manage team members</li>
              <li>- Configure settings</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-800">Editor</h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>- View all project data</li>
              <li>- Generate drafts and previews</li>
              <li>- Request approval for changes</li>
              <li>- Cannot apply or configure</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-800">Viewer</h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>- View all project data</li>
              <li>- Read-only access</li>
              <li>- Cannot generate or change</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
