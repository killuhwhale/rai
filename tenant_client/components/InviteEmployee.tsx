import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export function InviteEmployeeForm() {
  const { keycloak, roles } = useAuth();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [msg, setMsg] = useState<string>();

  if (!roles.includes("admin")) return null;

  async function invite() {
    const res = await fetch("/invite/employee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keycloak.token}`,
      },
      body: JSON.stringify({ email, firstName, lastName }),
    });
    if (res.ok) setMsg("Invitation sent!");
    else {
      const err = await res.text();
      setMsg(`Error: ${err}`);
    }
  }

  return (
    <div>
      <h3>Invite Employee</h3>
      <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input
        placeholder="First Name"
        onChange={(e) => setFirstName(e.target.value)}
      />
      <input
        placeholder="Last Name"
        onChange={(e) => setLastName(e.target.value)}
      />
      <button onClick={invite}>Send Invite</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
