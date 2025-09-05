import React, { useState, useEffect, useRef } from "react";

const SERVER_URL = "https://qr-chat-app-721ba63713ca.herokuapp.com";

function App() {
    const savedUserId = localStorage.getItem("userId");
    const savedName = localStorage.getItem("name");
    const savedRoomId = localStorage.getItem("roomId");
    const savedRoomName = localStorage.getItem("roomName");

    const [userId, setUserId] = useState(savedUserId || "");
    const [name, setName] = useState(savedName || "");
    const [joined, setJoined] = useState(!!savedUserId && !!savedRoomId);

    const [roomId, setRoomId] = useState(savedRoomId || "");
    const [roomName, setRoomName] = useState(savedRoomName || "");
    const [rooms, setRooms] = useState([]);
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState({});
    const [text, setText] = useState("");
    const [newRoomName, setNewRoomName] = useState("");

    const leavingRef = useRef(false);

    useEffect(() => {
        let interval;
        const update = async () => {
            await fetchRooms();
            if (joined && roomId) {
                await fetchMessages();
                const usersData = await fetchUsers();
                if (!usersData[userId]) leaveRoom();
            }
        };
        update();
        interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [joined, roomId]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/rooms`);
            const data = await res.json();
            setRooms(data);
        } catch (err) { console.error(err); }
    };

    const fetchMessages = async () => {
        if (!roomId) return;
        try {
            const res = await fetch(`${SERVER_URL}/rooms/${roomId}/messages`);
            const data = await res.json();
            setMessages(data);
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        if (!roomId) return {};
        try {
            const res = await fetch(`${SERVER_URL}/rooms/${roomId}/users`);
            const data = await res.json();
            setUsers(data);
            return data;
        } catch (err) { console.error(err); return {}; }
    };

    const joinRoom = async (selectedRoomId, selectedRoomName) => {
        if (!name) { alert("Lütfen isim girin"); return; }
        try {
            const res = await fetch(`${SERVER_URL}/join-room`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, roomId: selectedRoomId, roomName: selectedRoomName }),
            });
            const data = await res.json();

            // Server tarafından gelen userId ve room bilgilerini sakla
            setUserId(data.userId);
            setRoomId(data.roomId);
            setRoomName(selectedRoomName || data.roomName);
            setJoined(true);

            localStorage.setItem("userId", data.userId);
            localStorage.setItem("name", name);
            localStorage.setItem("roomId", data.roomId);
            localStorage.setItem("roomName", selectedRoomName || data.roomName);
        } catch (err) { console.error(err); }
    };

    const createAndJoinRoom = async () => {
        if (!newRoomName) { alert("Lütfen oda adı girin"); return; }
        await joinRoom(null, newRoomName);
        setNewRoomName("");
    };

    const sendMessage = async () => {
        if (!text || !roomId) return;
        try {
            await fetch(`${SERVER_URL}/rooms/${roomId}/message`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, text }),
            });
            setText("");
            fetchMessages();
        } catch (err) { console.error(err); }
    };

    const leaveRoom = async () => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        if (roomId && userId) {
            try {
                await fetch(`${SERVER_URL}/rooms/${roomId}/leave`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });
            } catch (err) { console.error(err); }
        }
        localStorage.removeItem("userId");
        localStorage.removeItem("name");
        localStorage.removeItem("roomId");
        localStorage.removeItem("roomName");
        setUserId("");
        setJoined(false);
        setRoomId("");
        setRoomName("");
        setMessages([]);
        setUsers({});
        leavingRef.current = false;
    };

    const closeRoom = async (targetRoomId) => {
        if (!window.confirm("Odayı kapatmak istediğinizden emin misiniz?")) return;
        try {
            await fetch(`${SERVER_URL}/rooms/${targetRoomId}/close`, { method: "POST" });
            fetchRooms();
            if (targetRoomId === roomId) leaveRoom();
        } catch (err) { console.error(err); }
    };

    const removeUser = async (targetUserId) => {
        if (!roomId) return;
        try {
            await fetch(`${SERVER_URL}/rooms/${roomId}/leave`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: targetUserId }),
            });
            fetchUsers();
        } catch (err) { console.error(err); }
    };

    if (!joined) {
        return (
            <div style={styles.container}>
                <h2>Odaya Katıl / Oluştur</h2>
                <div style={styles.inputRow}>
                    <input
                        style={styles.input}
                        placeholder="Adınızı girin"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <h3>Mevcut Odalar</h3>
                <ul style={styles.roomList}>
                    {rooms.map((r) => (
                        <li key={r.id} style={styles.roomItem}>
                            <span>{r.name} ({r.users} kişi, {r.messages} mesaj)</span>
                            <div style={{ display: "flex", gap: 5 }}>
                                <button style={styles.joinBtn} onClick={() => joinRoom(r.id)}>Katıl</button>
                                <button style={styles.closeRoomBtn} onClick={() => closeRoom(r.id)}>Kapat</button>
                            </div>
                        </li>
                    ))}
                </ul>

                <h4>Yeni Oda Oluştur</h4>
                <div style={styles.inputRow}>
                    <input
                        style={styles.input}
                        placeholder="Oda adı"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                    />
                    <button style={styles.joinBtn} onClick={createAndJoinRoom}>Oluştur ve Katıl</button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2>Oda: {roomName}</h2>
            <div style={styles.chatContainer}>
                <div style={styles.messages}>
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            style={{
                                marginBottom: 8,
                                padding: 5,
                                borderRadius: 5,
                                backgroundColor: msg.userId === userId ? "#DCF8C6" : "#FFF",
                                alignSelf: msg.userId === userId ? "flex-end" : "flex-start",
                                maxWidth: "80%"
                            }}
                        >
                            <b>{msg.name}</b>: {msg.text}
                        </div>
                    ))}
                </div>

                <div style={styles.users}>
                    <h3>Kullanıcılar</h3>
                    <ul style={{ padding: 0, listStyle: "none" }}>
                        {Object.entries(users).map(([id, u]) => (
                            <li key={id} style={{ marginBottom: 5 }}>
                                {u.name} [{id}]
                                <button style={styles.removeBtn} onClick={() => removeUser(id)}>Sil</button>
                            </li>
                        ))}
                    </ul>
                    <button style={{ ...styles.closeRoomBtn, width: "100%", marginTop: 10 }} onClick={() => closeRoom(roomId)}>Odayı Kapat</button>
                </div>
            </div>

            <div style={{ ...styles.inputRow, marginTop: 10 }}>
                <input
                    style={{ ...styles.input, flex: 1 }}
                    placeholder="Mesaj yaz"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                />
                <button style={styles.sendBtn} onClick={sendMessage}>Gönder</button>
            </div>
            <button style={{ ...styles.leaveBtn, marginTop: 10 }} onClick={leaveRoom}>Odayı Terk Et</button>
        </div>
    );
}

const styles = {
    container: { padding: 20, fontFamily: "Arial, sans-serif", maxWidth: 800, margin: "auto" },
    inputRow: { display: "flex", gap: 10, marginBottom: 10 },
    input: { padding: 8, fontSize: 14, flex: 1 },
    chatContainer: { display: "flex", gap: 20, marginTop: 10 },
    messages: { border: "1px solid #ccc", padding: 10, height: 350, width: 400, overflowY: "auto", borderRadius: 5, backgroundColor: "#f9f9f9", display: "flex", flexDirection: "column" },
    users: { border: "1px solid #ccc", padding: 10, height: 350, width: 200, overflowY: "auto", borderRadius: 5, backgroundColor: "#f1f1f1" },
    roomList: { listStyle: "none", padding: 0, marginBottom: 20 },
    roomItem: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, padding: 5, border: "1px solid #ddd", borderRadius: 5, backgroundColor: "#fff" },
    joinBtn: { padding: "5px 10px", backgroundColor: "#4CAF50", color: "white", border: "none", cursor: "pointer", borderRadius: 3 },
    closeRoomBtn: { padding: "5px 10px", backgroundColor: "#f44336", color: "white", border: "none", cursor: "pointer", borderRadius: 3 },
    removeBtn: { marginLeft: 5, padding: "3px 6px", backgroundColor: "#e53935", color: "white", border: "none", borderRadius: 3, cursor: "pointer" },
    sendBtn: { padding: "5px 15px", backgroundColor: "#2196F3", color: "white", border: "none", cursor: "pointer", borderRadius: 3 },
    leaveBtn: { padding: "5px 10px", backgroundColor: "#9E9E9E", color: "white", border: "none", cursor: "pointer", borderRadius: 3 },
};

export default App;
