import React, { useState, useEffect } from "react";
import { Search, Sparkles, RefreshCw } from "lucide-react";
import { OrderItem } from "../types";
import { apiUrl } from "../config";

interface OrderExplorerProps {
  onAskOrder: (orderId: string) => void;
}

export const OrderExplorer: React.FC<OrderExplorerProps> = ({ onAskOrder }) => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/orders?limit=500"));
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          const mapped: OrderItem[] = data.orders.map((o: any) => ({
            order_id: o.order_id,
            customer_name: o.customer_name,
            city: o.city,
            product: o.product,
            category: o.category,
            quantity: o.quantity,
            unit_price: o.unit_price_inr || o.unit_price,
            total_amount: o.total_inr || o.total_amount,
            order_date: o.order_date,
            delivery_date: o.delivery_date || o.order_date,
            status: o.status,
          }));
          setOrders(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to fetch live orders from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchStatus = statusFilter === "all" || order.status === statusFilter;
    const q = filterQuery.toLowerCase();
    const matchQuery =
      order.order_id.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      order.product.toLowerCase().includes(q) ||
      order.city.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <div className="flex flex-col gap-5 w-full" aria-label="Store Orders Explorer">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-on-surface">Store Dataset Explorer</h1>
          <p className="text-xs text-on-surface-variant font-mono mt-0.5">
            Active store dataset • {orders.length} total orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={fetchOrders}
            disabled={loading}
            title="Refresh orders from active dataset"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-primary" : ""} />
            <span>Refresh</span>
          </button>

          <div className="status-segment-tabs">
            {["all", "delivered", "shipped", "processing", "cancelled"].map((s) => (
              <button
                key={s}
                type="button"
                className={`status-segment-tab capitalize ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="explorer-search-bar">
        <Search size={18} className="text-outline" />
        <input
          type="text"
          className="bg-transparent border-none outline-none text-on-surface w-full font-mono text-xs placeholder:text-outline"
          placeholder="Filter orders by ID (#ORD-1025), customer name (Rohan), product, or city..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />
        {filterQuery && (
          <button
            type="button"
            className="text-outline hover:text-on-surface text-xs font-mono"
            onClick={() => setFilterQuery("")}
          >
            Clear
          </button>
        )}
      </div>

      {/* Explorer Table Card */}
      <div className="explorer-table-card">
        <div className="overflow-x-auto">
          <table className="leaderboard-table" aria-label="Orders table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer & City</th>
                <th>Product & Category</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Dates</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((ord) => (
                <tr key={ord.order_id}>
                  <td className="font-mono font-semibold text-primary">{ord.order_id}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-on-surface">{ord.customer_name}</span>
                      <span className="text-xs text-outline">{ord.city}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-on-surface">{ord.product}</span>
                      <span className="text-xs text-outline">{ord.category}</span>
                    </div>
                  </td>
                  <td className="font-mono font-semibold text-tertiary">
                    ₹{ord.total_amount.toLocaleString("en-IN")}
                  </td>
                  <td>
                    <span className={`explorer-status-badge ${ord.status}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{ord.status}</span>
                    </span>
                  </td>
                  <td className="font-mono text-xs text-outline">
                    <div>Ord: {ord.order_date}</div>
                    <div>Del: {ord.delivery_date}</div>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="action-btn-pill ml-auto"
                      onClick={() => onAskOrder(ord.order_id)}
                      title={`Ask assistant about ${ord.order_id}`}
                    >
                      <Sparkles size={12} className="text-primary" />
                      <span>Ask AI</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
