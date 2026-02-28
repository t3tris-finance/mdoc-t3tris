import { Link } from "react-router-dom";
import { useI18n } from "../i18n";

interface BreadcrumbProps {
  items: string[];
  current: string;
}

export default function Breadcrumb({ items, current }: BreadcrumbProps) {
  const { t, locale } = useI18n();

  return (
    <div className="breadcrumb">
      <Link to={`/${locale}/`}>🏠 {t.home}</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span className="separator"> › </span>
          <span>{item}</span>
        </span>
      ))}
      <span className="separator"> › </span>
      <span className="current">{current}</span>
    </div>
  );
}
