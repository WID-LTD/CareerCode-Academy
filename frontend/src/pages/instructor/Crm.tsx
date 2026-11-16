import CrmWorkspace from '@/components/crm/CrmWorkspace';
import SEO from '@/components/seo/SEO';

export default function InstructorCrm() {
  return (
    <>
      <SEO title="Learner relationships" description="See your students, risk signals, conversations and follow-ups." />
      <CrmWorkspace scope="instructor" />
    </>
  );
}
