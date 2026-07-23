import { DirectoryPage } from '@/components/dashboard/DirectoryPage';

export default function LearnersPage() {
  return <DirectoryPage kind="Learners" description="Manage enrolled learners and keep their institution records ready for academic workflows." addLabel="Enroll learner" detailLabel="Program / section" detailPlaceholder="e.g. Class 11 Science" />;
}
