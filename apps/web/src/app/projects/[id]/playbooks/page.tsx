/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Canonical Playbooks List Route
 *
 * Re-exports the existing Playbooks UI at the canonical /playbooks path.
 * The /automation/playbooks route is kept for backward compatibility.
 */
export { default } from '../automation/playbooks/page';
