import { DirectoryPage } from '@/components/dashboard/DirectoryPage';

export default function FacultyPage() {
  return <DirectoryPage kind="Faculty" description="Manage faculty members and prepare assignments for subjects, sections, and future sessions." addLabel="Add faculty" detailLabel="Primary subject" detailPlaceholder="e.g. Mathematics" />;
}
