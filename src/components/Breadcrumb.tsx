import { Link } from "react-router-dom";

interface BreadcrumbProps {
  items: string[];
  current: string;
}

export default function Breadcrumb({ items, current }: BreadcrumbProps) {
  return (
    <div className="breadcrumb">
      <Link to="/">🏠 Home</Link>
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
