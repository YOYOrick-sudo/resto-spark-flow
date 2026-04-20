import { createContext, useContext, ReactNode } from "react";

/**
 * SidebarStateContext — exposes the collapsed state of the main app sidebar
 * to descendants without prop-drilling.
 *
 * Used by ModuleSubNav to hide itself when the sidebar is expanded (in that
 * case, the sidebar already shows all sub-items inline → no need for a
 * second navigation layer).
 *
 * Default `collapsed=false` ensures components rendered outside the provider
 * (storybook, isolated tests, guest widget) behave as if the sidebar is
 * expanded — i.e. they still show the sub-nav, which is the safe default.
 */
interface SidebarStateValue {
  collapsed: boolean;
}

const SidebarStateContext = createContext<SidebarStateValue>({ collapsed: false });

export function SidebarStateProvider({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <SidebarStateContext.Provider value={{ collapsed }}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState(): SidebarStateValue {
  return useContext(SidebarStateContext);
}
