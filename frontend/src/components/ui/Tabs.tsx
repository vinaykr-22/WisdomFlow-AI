import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onValueChange, children, className = '' }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalValue;

  const setActiveTab = (tabId: string) => {
    if (value === undefined) setInternalValue(tabId);
    onValueChange?.(tabId);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={`flex flex-col gap-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-800 ${className}`}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabTrigger({
  value,
  children,
  className = '',
  icon,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabTrigger must be used within Tabs');

  const isActive = ctx.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => ctx.setActiveTab(value)}
      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 ${
        isActive
          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
      } ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function TabContent({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabContent must be used within Tabs');

  if (ctx.activeTab !== value) return null;

  return (
    <div role="tabpanel" className={`animate-in fade-in duration-150 ${className}`}>
      {children}
    </div>
  );
}
