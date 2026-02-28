import { Helmet } from "react-helmet-async";

const SITE_NAME = "T3tris Protocol";
const SITE_URL = "https://docs.t3tris.xyz"; // Update with your actual domain
const DEFAULT_DESCRIPTION =
  "T3tris is a tokenized vault protocol built on the ERC-4626 standard, designed for professional asset management with institutional-grade features.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  /** Page title — will be appended with " | T3tris Docs" */
  title?: string;
  /** Meta description (max ~155 chars) */
  description?: string;
  /** Canonical path, e.g. "/liquidity-providers/depositing" */
  path?: string;
  /** Open Graph image URL */
  image?: string;
  /** Open Graph type — defaults to "article" for doc pages */
  type?: "website" | "article";
  /** Breadcrumb items for structured data */
  breadcrumb?: string[];
  /** Language code */
  locale?: string;
  /** Published date (ISO string) */
  publishedTime?: string;
  /** Modified date (ISO string) */
  modifiedTime?: string;
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "article",
  breadcrumb = [],
  locale = "en",
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const fullTitle = title
    ? `${title} | ${SITE_NAME} Docs`
    : `${SITE_NAME} — Documentation`;
  const canonicalUrl = `${SITE_URL}${path}`;
  const truncatedDescription =
    description.length > 160 ? description.slice(0, 157) + "..." : description;

  // JSON-LD Structured Data — Article + BreadcrumbList
  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title || SITE_NAME,
    description: truncatedDescription,
    url: canonicalUrl,
    image,
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    ...(publishedTime && { datePublished: publishedTime }),
    ...(modifiedTime && { dateModified: modifiedTime }),
  };

  const breadcrumbItems = [
    { name: "Home", url: SITE_URL },
    ...breadcrumb.map((item, i) => ({
      name: item,
      url: `${SITE_URL}/${breadcrumb
        .slice(0, i + 1)
        .map((b) => b.toLowerCase().replace(/\s+/g, "-"))
        .join("/")}`,
    })),
    ...(title ? [{ name: title, url: canonicalUrl }] : []),
  ];

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  const jsonLdWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${SITE_NAME} Documentation`,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={truncatedDescription} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Language */}
      <html lang={locale} />
      <meta
        property="og:locale"
        content={locale === "fr" ? "fr_FR" : "en_US"}
      />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={`${SITE_NAME} Documentation`} />
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={truncatedDescription} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLdArticle)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(jsonLdBreadcrumb)}
      </script>
      {type === "website" && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLdWebSite)}
        </script>
      )}
    </Helmet>
  );
}
