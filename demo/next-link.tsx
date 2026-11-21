import type { AnchorHTMLAttributes } from "react";
import { navigate } from "./router";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export default function Link({ href, onClick, children, ...rest }: Props) {
  const top = href.replace(/^\//, "");
  const shown = ["cours", "session", "progres", "reglages"].includes(top) ? "#" + top : "#";
  return (
    <a
      {...rest}
      href={shown}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
