import CrmWorkspace from '@/components/crm/CrmWorkspace';
import SEO from '@/components/seo/SEO';

export default function AdminCrm() {
  return (
    <>
      <SEO title="Customer relationships" description="Manage people, accounts, pipeline, campaigns, support and outcomes." />
      <CrmWorkspace scope="admin" />
    </>
  );
}
