import { useState } from "react";
import { ethers } from "ethers";
import contractJson from "./ChainOfHope.json";
import contractAddressJson from "./contract-address.json";

const abi = contractJson.abi;
const contractAddress = contractAddressJson.contractAddress;

function App() {
  // wallet + contract
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // UI menu
  const [menu, setMenu] = useState("");

  // organ states
  const [donorName, setDonorName] = useState("");
  const [donorBlood, setDonorBlood] = useState("");
  const [donorOrgan, setDonorOrgan] = useState("");
  const [donorAge, setDonorAge] = useState("");
  const [donorReport, setDonorReport] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [recipientBlood, setRecipientBlood] = useState("");
  const [recipientOrgan, setRecipientOrgan] = useState("");

  // lists
  const [donors, setDonors] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [matches, setMatches] = useState([]);

  // per-recipient matches map
  const [recipientMatches, setRecipientMatches] = useState({});
  const [currentRecipientId, setCurrentRecipientId] = useState(null);
  const [matchResult, setMatchResult] = useState("");

  // blood states
  const [bloodDonorName, setBloodDonorName] = useState("");
  const [bloodDonorType, setBloodDonorType] = useState("");
  const [bloodDonorAge, setBloodDonorAge] = useState("");
  const [bloodDonorReport, setBloodDonorReport] = useState("");

  const [bloodRecipientName, setBloodRecipientName] = useState("");
  const [bloodRecipientType, setBloodRecipientType] = useState("");

  const [bloodDonors, setBloodDonors] = useState([]);
  const [bloodRecipients, setBloodRecipients] = useState([]);
  const [bloodMatches, setBloodMatches] = useState([]);

  const [bloodRecipientMatches, setBloodRecipientMatches] = useState({});
  const [currentBloodRecipientId, setCurrentBloodRecipientId] = useState(null);
  const [bloodMatchResult, setBloodMatchResult] = useState("");

  // styles
  const buttonStyle = { margin: "6px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", border: "none", backgroundColor: "#ff7a18", color: "#111" };
  const sectionStyle = { border: "1px solid #ddd", borderRadius: "10px", padding: "14px", margin: "12px 0", background: "#fff3e0", color: "#111" };
  const listStyle = { maxHeight: "160px", overflowY: "auto", border: "1px solid #ddd", padding: "8px", borderRadius: "6px", background: "#ffffff", color: "#111" };

  // Connect wallet and contract
  async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0]);
    const c = new ethers.Contract(contractAddress, abi, signer);
    setContract(c);
  }

  // ---------------- Organ functions ----------------
  async function registerDonor() {
    if (!contract) return alert("Connect wallet");
    if (!donorName || !donorBlood || !donorOrgan || !donorAge || !donorReport) return alert("All donor fields (including report URL) are required");
    try {
      const tx = await contract.registerDonor(donorName, donorBlood, donorOrgan, Number(donorAge), donorReport);
      await tx.wait();
      alert("Organ donor registered");
      setDonorName(""); setDonorBlood(""); setDonorOrgan(""); setDonorAge(""); setDonorReport("");
    } catch (e) {
      console.error(e);
      alert("Failed to register organ donor: " + (e?.error?.message || e.message || e));
    }
  }

  async function registerRecipientAndMatch() {
    if (!contract) return alert("Connect wallet");
    if (!recipientName || !recipientBlood || !recipientOrgan) return alert("All recipient fields required");
    try {
      const tx = await contract.registerRecipient(recipientName, recipientBlood, recipientOrgan);
      await tx.wait();

      const recipientIdBN = await contract.recipientCount();
      const recipientId = Number(recipientIdBN);
      setCurrentRecipientId(recipientId);

      const res = await contract.findMatchesForRecipient(recipientId);
      const donorList = res.map((d) => {
        // ethers returns both array and object, handle both
        const id = d.id ? Number(d.id) : Number(d[0]);
        const name = d.name ? d.name : d[1];
        const blood = d.bloodType ? d.bloodType : d[2];
        const organ = d.organ ? d.organ : d[3];
        const age = d.age ? Number(d.age) : Number(d[4]);
        const report = d.reportUrl ? d.reportUrl : d[5];
        const matched = d.matched ? d.matched : d[6];
        return { id, name, blood, organ, age, report, matched };
      });

      setRecipientMatches((prev) => ({ ...prev, [recipientId]: donorList }));
      setMatchResult(donorList.length ? "Matches found" : "No matches");
      setRecipientName(""); setRecipientBlood(""); setRecipientOrgan("");
    } catch (e) {
      console.error(e);
      setMatchResult("Error during matching");
    }
  }

  async function findMatchesForRecipient(recipientId) {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.findMatchesForRecipient(recipientId);
      const donorList = res.map((d) => {
        const id = d.id ? Number(d.id) : Number(d[0]);
        const name = d.name ? d.name : d[1];
        const blood = d.bloodType ? d.bloodType : d[2];
        const organ = d.organ ? d.organ : d[3];
        const age = d.age ? Number(d.age) : Number(d[4]);
        const report = d.reportUrl ? d.reportUrl : d[5];
        const matched = d.matched ? d.matched : d[6];
        return { id, name, blood, organ, age, report, matched };
      });
      setRecipientMatches((prev) => ({ ...prev, [recipientId]: donorList }));
      setCurrentRecipientId(recipientId);
      setMatchResult(donorList.length ? "Matches found" : "No matches");
    } catch (e) {
      console.error(e);
      alert("Failed to find matches");
    }
  }

  async function finalizeMatch(donorId, recipientId) {
    if (!contract) return alert("Connect wallet");
    try {
      const tx = await contract.finalizeMatch(donorId, recipientId);
      await tx.wait();
      alert("Organ match finalized");
      // clear that recipient's matches
      setRecipientMatches((prev) => ({ ...prev, [recipientId]: [] }));
    } catch (e) {
      console.error(e);
      alert("Failed to finalize match");
    }
  }

  async function getAllDonors() {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.getAllDonors();
      const list = res.map((d) => {
        const id = d.id ? Number(d.id) : Number(d[0]);
        const name = d.name ? d.name : d[1];
        const blood = d.bloodType ? d.bloodType : d[2];
        const organ = d.organ ? d.organ : d[3];
        const age = d.age ? Number(d.age) : Number(d[4]);
        const report = d.reportUrl ? d.reportUrl : d[5];
        const reg = d.registered ? d.registered : d[6];
        const matched = d.matched ? d.matched : d[7];
        return { id, name, blood, organ, age, report, reg, matched };
      });
      setDonors(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function getAllRecipients() {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.getAllRecipients();
      const list = res.map((r) => {
        const id = r.id ? Number(r.id) : Number(r[0]);
        const name = r.name ? r.name : r[1];
        const blood = r.bloodType ? r.bloodType : r[2];
        const organ = r.organ ? r.organ : r[3];
        const reg = r.registered ? r.registered : r[4];
        const matched = r.matched ? r.matched : r[5];
        return { id, name, blood, organ, reg, matched };
      });
      setRecipients(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function getAllMatches() {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.getAllMatches();
      const list = res.map((m, i) => ({
        id: i + 1,
        donorId: Number(m.donorId),
        recipientId: Number(m.recipientId),
        timestamp: Number(m.timestamp)
      }));
      setMatches(list.map((m) => ({ ...m, tsStr: new Date(m.timestamp * 1000).toLocaleString() })));
    } catch (e) {
      console.error(e);
    }
  }

  // ---------------- Blood functions ----------------
  async function registerBloodDonor() {
    if (!contract) return alert("Connect wallet");
    if (!bloodDonorName || !bloodDonorType || !bloodDonorAge || !bloodDonorReport) return alert("All blood donor fields (including report URL) required");
    try {
      const tx = await contract.registerBloodDonor(bloodDonorName, bloodDonorType, Number(bloodDonorAge), bloodDonorReport);
      await tx.wait();
      alert("Blood donor registered");
      setBloodDonorName(""); setBloodDonorType(""); setBloodDonorAge(""); setBloodDonorReport("");
    } catch (e) {
      console.error(e);
      alert("Failed to register blood donor");
    }
  }

  async function registerBloodRecipientAndMatch() {
    if (!contract) return alert("Connect wallet");
    if (!bloodRecipientName || !bloodRecipientType) return alert("All blood recipient fields required");
    try {
      const tx = await contract.registerBloodRecipient(bloodRecipientName, bloodRecipientType);
      await tx.wait();
      const recipientIdBN = await contract.bloodRecipientCount();
      const recipientId = Number(recipientIdBN);
      setCurrentBloodRecipientId(recipientId);

      const res = await contract.findBloodMatchesForRecipient(recipientId);
      const donorList = res.map((d) => {
        const id = d.id ? Number(d.id) : Number(d[0]);
        const name = d.name ? d.name : d[1];
        const blood = d.bloodType ? d.bloodType : d[2];
        const age = d.age ? Number(d.age) : Number(d[3]);
        const report = d.reportUrl ? d.reportUrl : d[4];
        const matched = d.matched ? d.matched : d[5];
        return { id, name, blood, age, report, matched };
      });

      setBloodRecipientMatches((prev) => ({ ...prev, [recipientId]: donorList }));
      setBloodMatchResult(donorList.length ? "Matches found" : "No matches");
      setBloodRecipientName(""); setBloodRecipientType("");
    } catch (e) {
      console.error(e);
      setBloodMatchResult("Error during matching");
    }
  }

  async function findBloodMatchesForRecipient(recipientId) {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.findBloodMatchesForRecipient(recipientId);
      const donorList = res.map((d) => {
        const id = d.id ? Number(d.id) : Number(d[0]);
        const name = d.name ? d.name : d[1];
        const blood = d.bloodType ? d.bloodType : d[2];
        const age = d.age ? Number(d.age) : Number(d[3]);
        const report = d.reportUrl ? d.reportUrl : d[4];
        const matched = d.matched ? d.matched : d[5];
        return { id, name, blood, age, report, matched };
      });
      setBloodRecipientMatches((prev) => ({ ...prev, [recipientId]: donorList }));
      setCurrentBloodRecipientId(recipientId);
      setBloodMatchResult(donorList.length ? "Matches found" : "No matches");
    } catch (e) {
      console.error(e);
      alert("Failed to find blood matches");
    }
  }

  async function finalizeBloodMatch(donorId, recipientId) {
    if (!contract) return alert("Connect wallet");
    try {
      const tx = await contract.finalizeBloodMatch(donorId, recipientId);
      await tx.wait();
      alert("Blood match finalized");
      setBloodRecipientMatches((prev) => ({ ...prev, [recipientId]: [] }));
    } catch (e) {
      console.error(e);
      alert("Failed to finalize blood match");
    }
  }

  async function getAllBloodDonors() {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.getAllBloodDonors();
      const list = res.map((d) => {
        const id = d.id ? Number(d.id) : Number(d[0]);
        const name = d.name ? d.name : d[1];
        const blood = d.bloodType ? d.bloodType : d[2];
        const age = d.age ? Number(d.age) : Number(d[3]);
        const report = d.reportUrl ? d.reportUrl : d[4];
        const reg = d.registered ? d.registered : d[5];
        const matched = d.matched ? d.matched : d[6];
        return { id, name, blood, age, report, reg, matched };
      });
      setBloodDonors(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function getAllBloodRecipients() {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.getAllBloodRecipients();
      const list = res.map((r) => {
        const id = r.id ? Number(r.id) : Number(r[0]);
        const name = r.name ? r.name : r[1];
        const blood = r.bloodType ? r.bloodType : r[2];
        const reg = r.registered ? r.registered : r[3];
        const matched = r.matched ? r.matched : r[4];
        return { id, name, blood, reg, matched };
      });
      setBloodRecipients(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function getAllBloodMatches() {
    if (!contract) return alert("Connect wallet");
    try {
      const res = await contract.getAllBloodMatches();
      const list = res.map((m, i) => ({ id: i + 1, donorId: Number(m.donorId), recipientId: Number(m.recipientId), timestamp: Number(m.timestamp) }));
      setBloodMatches(list.map((m) => ({ ...m, tsStr: new Date(m.timestamp * 1000).toLocaleString() })));
    } catch (e) {
      console.error(e);
    }
  }

  // ---------- UI ----------
  return (
    <div style={{ padding: "18px", fontFamily: "Arial, sans-serif", background: "#dark", color: "#fff", minHeight: "100vh" }}>
      <h1 style={{ textAlign: "center", color: "#ffb347" }}>Chain of Hope</h1>

      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <button onClick={connectWallet} style={{ ...buttonStyle, backgroundColor: "#06b6d4", color: "#000" }}>Connect Wallet</button>
        <div style={{ marginTop: "8px" }}>Connected: {account || "not connected"}</div>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <button onClick={() => setMenu("organ")} style={buttonStyle}>Organ Matching</button>
        <button onClick={() => setMenu("blood")} style={buttonStyle}>Blood Matching</button>
      </div>

      {/* ORGAN */}
      {menu === "organ" && (
        <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "10px", marginBottom: "20px", background: "black" }}>
          <h2 style={{ color: "#ffb347" }}>Organ Matching</h2>

          <div>
            <h3>Register Donor</h3>
            <input placeholder="Name" value={donorName} onChange={(e) => setDonorName(e.target.value)} />{" "}
            <input placeholder="Age" type="number" value={donorAge} onChange={(e) => setDonorAge(e.target.value)} style={{ width: "80px" }} />{" "}
            <input placeholder="Doctor Report URL (Google Drive / link)" value={donorReport} onChange={(e) => setDonorReport(e.target.value)} style={{ width: "320px" }} />{" "}
            <select value={donorBlood} onChange={(e) => setDonorBlood(e.target.value)}>
              <option value="">Blood</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>{" "}
            <select value={donorOrgan} onChange={(e) => setDonorOrgan(e.target.value)}>
              <option value="">Organ</option><option>kidney</option><option>heart</option><option>liver</option><option>lung</option>
            </select>{" "}
            <button onClick={registerDonor} style={buttonStyle}>Submit</button>
          </div>

          <div style={{ marginTop: "10px" }}>
            <h3>Request Organ</h3>
            <input placeholder="Name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />{" "}
            <select value={recipientBlood} onChange={(e) => setRecipientBlood(e.target.value)}>
              <option value="">Blood</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>{" "}
            <select value={recipientOrgan} onChange={(e) => setRecipientOrgan(e.target.value)}>
              <option value="">Organ</option><option>kidney</option><option>heart</option><option>liver</option><option>lung</option>
            </select>{" "}
            <button onClick={registerRecipientAndMatch} style={buttonStyle}>Submit & Auto-Match</button>
            <div style={{ marginTop: "6px" }}>{matchResult}</div>
          </div>

          {/* Available donors for currently selected recipient (if any) */}
          {recipientMatches[currentRecipientId] && recipientMatches[currentRecipientId].length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <h4>Available Donors (for selected recipient)</h4>
              <ul style={listStyle}>
                {recipientMatches[currentRecipientId].map((d) => (
                  <li key={d.id} style={{ marginBottom: "8px" }}>
                    <strong>{d.id}. {d.name}</strong> ({d.blood}, {d.organ}) — Age: {d.age}
                    {d.report && <a href={d.report} target="_blank" rel="noreferrer" style={{ marginLeft: "10px", color: "#b45309" }}>📄 View Report</a>}
                    <button onClick={() => finalizeMatch(d.id, currentRecipientId)} style={{ ...buttonStyle, marginLeft: "10px" }}>Select</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: "14px" }}>
            <h3>View Data</h3>

            <div style={{ marginBottom: "8px" }}>
              <button onClick={getAllDonors} style={buttonStyle}>Load Donors</button>
              <div style={listStyle}>
                {donors.map((d) => (
                  <div key={d.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    {d.id}. <strong>{d.name}</strong> ({d.blood}, {d.organ}) — Age: {d.age} [{d.matched ? "Matched" : "Waiting"}]
                    {d.report && <a href={d.report} target="_blank" rel="noreferrer" style={{ marginLeft: "10px", color: "#b45309" }}>📄 Report</a>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <button onClick={getAllRecipients} style={buttonStyle}>Load Recipients</button>
              {/* Show recipients and a Find Matches button with nested results */}
              <div style={{ maxHeight: "160px", overflowY: "auto", background: "#fff", color: "#111", padding: "8px", borderRadius: "6px" }}>
                {recipients.map((r) => (
                  <div key={r.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    {r.id}. <strong>{r.name}</strong> ({r.blood}, {r.organ}) [{r.matched ? "✅ Matched" : "⏳ Waiting"}]
                    <button onClick={() => findMatchesForRecipient(r.id)} style={{ ...buttonStyle, marginLeft: "8px" }}>Find Matches</button>

                    {/* show matches just under this recipient if fetched */}
                    {recipientMatches[r.id] && recipientMatches[r.id].length > 0 && (
                      <ul style={{ marginLeft: "14px", marginTop: "6px" }}>
                        {recipientMatches[r.id].map((d) => (
                          <li key={d.id} style={{ marginBottom: "6px" }}>
                            ➤ {d.name} ({d.blood}, {d.organ}) — Age: {d.age}
                            {d.report && <a href={d.report} target="_blank" rel="noreferrer" style={{ marginLeft: "8px", color: "#b45309" }}>📄 Report</a>}
                            <button onClick={() => finalizeMatch(d.id, r.id)} style={{ ...buttonStyle, marginLeft: "8px" }}>Select</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button onClick={getAllMatches} style={buttonStyle}>Load Matches</button>
              <div style={listStyle}>
                {matches.map((m) => (
                  <div key={m.id}>{m.id}. Donor {m.donorId} ↔ Recipient {m.recipientId} ({new Date(m.timestamp * 1000).toLocaleString()})</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BLOOD */}
      {menu === "blood" && (
        <div style={{ border: "1px solid #ccc", padding: "20px", borderRadius: "10px", marginBottom: "20px", background: "black" }}>
          <h2 style={{ color: "#ffb347" }}>Blood Matching</h2>

          <div>
            <h3>Register Blood Donor</h3>
            <input placeholder="Name" value={bloodDonorName} onChange={(e) => setBloodDonorName(e.target.value)} />{" "}
            <input placeholder="Age" type="number" value={bloodDonorAge} onChange={(e) => setBloodDonorAge(e.target.value)} style={{ width: "80px" }} />{" "}
            <input placeholder="Doctor Report URL (Google Drive / link)" value={bloodDonorReport} onChange={(e) => setBloodDonorReport(e.target.value)} style={{ width: "320px" }} />{" "}
            <select value={bloodDonorType} onChange={(e) => setBloodDonorType(e.target.value)}>
              <option value="">Blood</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>{" "}
            <button onClick={registerBloodDonor} style={buttonStyle}>Submit</button>
          </div>

          <div style={{ marginTop: "10px" }}>
            <h3>Request Blood</h3>
            <input placeholder="Name" value={bloodRecipientName} onChange={(e) => setBloodRecipientName(e.target.value)} />{" "}
            <select value={bloodRecipientType} onChange={(e) => setBloodRecipientType(e.target.value)}>
              <option value="">Blood</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
            </select>{" "}
            <button onClick={registerBloodRecipientAndMatch} style={buttonStyle}>Submit & Auto-Match</button>
            <div style={{ marginTop: "6px" }}>{bloodMatchResult}</div>
          </div>

          {currentBloodRecipientId && bloodRecipientMatches[currentBloodRecipientId] && bloodRecipientMatches[currentBloodRecipientId].length > 0 && (
            <div style={{ marginTop: "12px" }}>
              <h4>Available Blood Donors</h4>
              <ul style={listStyle}>
                {bloodRecipientMatches[currentBloodRecipientId].map((d) => (
                  <li key={d.id} style={{ marginBottom: "8px" }}>
                    <strong>{d.id}. {d.name}</strong> ({d.blood}) — Age: {d.age}
                    {d.report && <a href={d.report} target="_blank" rel="noreferrer" style={{ marginLeft: "10px", color: "#b45309" }}>📄 View Report</a>}
                    <button onClick={() => finalizeBloodMatch(d.id, currentBloodRecipientId)} style={{ ...buttonStyle, marginLeft: "10px" }}>Select</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: "14px" }}>
            <div>
              <button onClick={getAllBloodDonors} style={buttonStyle}>Load Blood Donors</button>
              <div style={listStyle}>
                {bloodDonors.map((d) => (
                  <div key={d.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    {d.id}. <strong>{d.name}</strong> ({d.blood}) — Age: {d.age} [{d.matched ? "Matched" : "Waiting"}]
                    {d.report && <a href={d.report} target="_blank" rel="noreferrer" style={{ marginLeft: "10px", color: "#b45309" }}>📄 Report</a>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "8px" }}>
              <button onClick={getAllBloodRecipients} style={buttonStyle}>Load Blood Recipients</button>
              <div style={{ maxHeight: "160px", overflowY: "auto", background: "#fff", color: "#111", padding: "8px", borderRadius: "6px" }}>
                {bloodRecipients.map((r) => (
                  <div key={r.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                    {r.id}. <strong>{r.name}</strong> ({r.blood}) [{r.matched ? "✅ Matched" : "⏳ Waiting"}]
                    <button onClick={() => findBloodMatchesForRecipient(r.id)} style={{ ...buttonStyle, marginLeft: "8px" }}>Find Matches</button>

                    {bloodRecipientMatches[r.id] && bloodRecipientMatches[r.id].length > 0 && (
                      <ul style={{ marginLeft: "14px", marginTop: "6px" }}>
                        {bloodRecipientMatches[r.id].map((d) => (
                          <li key={d.id} style={{ marginBottom: "6px" }}>
                            ➤ {d.name} ({d.blood}) — Age: {d.age}
                            {d.report && <a href={d.report} target="_blank" rel="noreferrer" style={{ marginLeft: "8px", color: "#b45309" }}>📄 Report</a>}
                            <button onClick={() => finalizeBloodMatch(d.id, r.id)} style={{ ...buttonStyle, marginLeft: "8px" }}>Select</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "8px" }}>
              <button onClick={getAllBloodMatches} style={buttonStyle}>Load Blood Matches</button>
              <div style={listStyle}>
                {bloodMatches.map((m) => (
                  <div key={m.id}>{m.id}. Donor {m.donorId} ↔ Recipient {m.recipientId} ({new Date(m.timestamp * 1000).toLocaleString()})</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
