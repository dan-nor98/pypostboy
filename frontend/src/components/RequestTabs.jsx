import {AlertTriangle, X} from 'lucide-react';
import {Method} from './Method';

export function RequestTabs() {
  return (
    <div className="tabs" role="tablist">
      <button className="request-tab active"><Method m="POST" />Create Deposit<span className="dirty">●</span><X size={13} /></button>
      <button className="request-tab"><Method m="GET" />Deposit Status<X size={13} /></button>
      <button className="request-tab error"><Method m="POST" />Login <AlertTriangle size={12} /><X size={13} /></button>
    </div>
  );
}
