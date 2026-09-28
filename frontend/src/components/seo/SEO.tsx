import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'CareerCode Academy';
const DEFAULT_DESC = 'Helping beginners become job-ready software developers through practical project-based learning.';
const BASE_URL = 'https://careercode.com.ng';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

export default function SEO({ title, description, image, url, type = 'website' }: SEOProps) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || DEFAULT_DESC;
  const ogImage = image || '/screen.png';

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url || BASE_URL} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
