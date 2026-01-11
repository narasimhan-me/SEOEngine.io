/**
 * [PLAYBOOK-ENTRYPOINT-INTEGRITY-1] Canonical Playbook Run Route
 *
 * Route shape: /projects/:projectId/playbooks/:playbookId?step=preview|estimate|apply&source=<entrypoint>
 *
 * Re-exports the existing Playbooks UI at the canonical route.
 * The playbookId path param is read by the Playbooks page to pre-select the playbook.
 */
export { default } from '../../automation/playbooks/page';
