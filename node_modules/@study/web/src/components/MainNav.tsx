import type { View } from "../types";

type MainNavProps = {
  navItems: Array<{ id: View; label: string }>;
  activeView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
};

export function MainNav(props: MainNavProps) {
  return (
    <aside className="side-nav" aria-label="Primary">
      <div className="side-brand">StudyGroupFinder</div>
      {/* <div className="side-label">Find your mates</div> */}

      <nav className="side-links">
        {props.navItems.map((item) => (
          <button
            key={item.id}
            className={item.id === props.activeView ? "side-btn active" : "side-btn"}
            onClick={() => props.onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <button type="button" className="side-btn logout" onClick={props.onLogout}>
        Log out
      </button>
    </aside>
  );
}
