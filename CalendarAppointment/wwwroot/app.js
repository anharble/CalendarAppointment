const API_BASE_URL = "https://localhost:7075/api/appointments";
let appointments = [];

let currentDisplayDate = new Date();
let pendingReminderId = null;

//KHỞI TẠO & ĐIỀU HƯỚNG ---

async function loadDataFromApi() {
    try {
        const response = await fetch(API_BASE_URL);
        const result = await response.json();
        if (result.success) {
            appointments = result.data;
            renderCalendar();
            renderAppointments();
        }
    } catch (error) {
        console.error("Lỗi kết nối API:", error);
    }
}

function updateClock() {
    const clockEl = document.getElementById('current-time');
    if (clockEl) clockEl.innerText = new Date().toLocaleString('vi-VN');
}
setInterval(updateClock, 1000);

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    if (pageId === 'home-page') renderCalendar();
    else if (pageId === 'list-page') renderAppointments();
}

// ---BỘ LỊCH ---

function renderCalendar() {
    const daysContainer = document.getElementById('calendar-days');
    const monthYearText = document.getElementById('month-year');
    if (!daysContainer) return;

    daysContainer.innerHTML = '';
    const year = currentDisplayDate.getFullYear();
    const month = currentDisplayDate.getMonth();
    monthYearText.innerText = `Tháng ${month + 1} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();

    for (let x = firstDayIndex; x > 0; x--) {
        daysContainer.innerHTML += `<div class="day other-month">${prevLastDay - x + 1}</div>`;
    }

    // Ngày tháng hiện tại
    for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const hasEvent = appointments.some(app => app.startTime && app.startTime.startsWith(dateStr));
        const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();

        const daySquare = document.createElement('div');
        daySquare.className = `day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`;
        daySquare.innerText = i;
        daySquare.onclick = () => viewDayEvents(dateStr);
        daysContainer.appendChild(daySquare);
    }
}

function viewDayEvents(dateStr) {
    const dayEvents = appointments.filter(app => app.startTime && app.startTime.startsWith(dateStr));
    const formattedDate = dateStr.split('-').reverse().join('/');

    if (dayEvents.length > 0) {
        let html = `
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid #eee; text-align: left; color: #7f8c8d;">
                            <th style="padding: 8px; width: 80px;">Giờ</th>
                            <th style="padding: 8px;">Sự kiện & Địa điểm</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        dayEvents.sort((a, b) => new Date(a.startTime) - new Date(b.startTime)).forEach((e) => {
            const time = new Date(e.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            html += `
                <tr style="border-bottom: 1px solid #f9f9f9;">
                    <td style="padding: 12px 8px; vertical-align: top; font-weight: bold; color: #2c3e50;">
                        ${time}
                    </td>
                    <td style="padding: 12px 8px;">
                        <div style="color: #3498db; font-weight: 600; margin-bottom: 4px;">${e.name}</div>
                        <div style="color: #95a5a6; font-size: 0.8rem;">📍 ${e.location || 'Không có địa điểm'}</div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        showDialog(`Lịch ngày ${formattedDate}`, html, [
            { text: "Đóng", className: "btn-cancel", callback: null },
            { text: "Quản lý chi tiết", className: "btn-confirm", callback: () => navigateTo('list-page') }
        ]);
    } else {
        showConfirm(`Ngày ${formattedDate} chưa có lịch. Thêm mới ngay?`, () => {
            clearForm();
            openModal(dateStr);
        });
    }
}

// ---QUẢN LÝ DỮ LIỆU (CRUD) ---

function clearForm() {
    document.getElementById('edit-id').value = "";
    document.getElementById('event-name').value = "";
    document.getElementById('event-location').value = "";
    document.getElementById('start-time').value = "";
    document.getElementById('end-time').value = "";
    document.querySelector('input[name="meeting-type"][value="false"]').checked = true;

    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.innerText = "Thêm Lịch Hẹn";
}

function openModal(date = null) {
    clearForm();
    document.getElementById('appointment-modal').style.display = 'flex';

    if (date) {
        document.getElementById('start-time').value = `${date}T08:00`;
        document.getElementById('end-time').value = `${date}T09:00`;
    }
}

function closeModal() {
    document.getElementById('appointment-modal').style.display = 'none';
}

function checkTimeConflict(startTime, endTime, currentId) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    return appointments.find(app => {
        if (currentId && (app.appointmentID == currentId)) return false;

        const appStart = new Date(app.startTime);
        const appEnd = new Date(app.endTime);
        return (start < appEnd && end > appStart);
    });
}

function findMatchingGroupMeeting(name, start, end) {
    const duration = new Date(end) - new Date(start);

    return appointments.find(app => {
        const appDuration = new Date(app.endTime) - new Date(app.startTime);
        return app.isGroupMeeting === true &&
            app.name.toLowerCase() === name.toLowerCase() &&
            duration === appDuration;
    });
}

async function joinGroupMeeting(appointmentID) {
    const currentUserID = 1;
    const url = `${API_BASE_URL}/join?groupMeetingId=${appointmentID}&userId=${currentUserID}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) throw new Error("Lỗi mạng hoặc Server");

        const result = await response.json();
        if (result.success) {
            showAlert("✅ " + result.message);
            closeModal();
            await loadDataFromApi();
        } else {
            showAlert("⚠️ " + result.message);
        }
    } catch (e) {
        console.error("Join error:", e);
    }
}
async function saveAppointment() {
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('event-name').value.trim();
    const location = document.getElementById('event-location').value.trim();
    const startTimeStr = document.getElementById('start-time').value;
    const endTimeStr = document.getElementById('end-time').value;
    const isGroupMeeting = document.querySelector('input[name="meeting-type"]:checked').value === "true";

    if (!name || !startTimeStr || !endTimeStr) {
        showAlert("⚠️ Vui lòng nhập đầy đủ thông tin!");
        return;
    }

    if (new Date(endTimeStr) <= new Date(startTimeStr)) {
        showAlert("⚠️ Thời gian kết thúc phải lớn hơn thời gian bắt đầu!");
        document.getElementById('end-time').style.border = "2px solid #e74c3c";
        return;
    }

    const matchingGroup = findMatchingGroupMeeting(name, startTimeStr, endTimeStr);
    if (matchingGroup && !id) {
        showConfirm(
            `Phát hiện cuộc họp nhóm "${name}" có cùng thời gian. Bạn có muốn tham gia vào danh sách người tham gia của cuộc họp này không?`,
            async () => {
                await joinGroupMeeting(matchingGroup.appointmentID);
            },
            "Tham gia ngay"
        );
        return;
    }

    const conflictApp = checkTimeConflict(startTimeStr, endTimeStr, id);
    if (conflictApp) {
        showDialog(
            "⚠️ Xung đột lịch hẹn",
            `Bạn đã có cuộc hẹn "${conflictApp.name}" vào thời gian này. Bạn muốn làm gì?`,
            [
                { text: "Chọn thời gian khác", className: "btn-cancel", callback: null },
                {
                    text: "Ghi đè (Thay thế)",
                    className: "btn-del",
                    callback: () => executeSave(true)
                }
            ]
        );
        return;
    }

    const appointmentData = {
        name, location,
        startTime: startTimeStr,
        endTime: endTimeStr,
        userID: 1,
        isGroupMeeting: isGroupMeeting
    };

    try {
        const method = id ? "PUT" : "POST";
        const url = id ? `${API_BASE_URL}/${id}` : API_BASE_URL;

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(appointmentData)
        });

        const result = await response.json();

        if (result.success) {
            closeModal();
            await loadDataFromApi();
            showReminderSetupForm(
                id || result.data?.appointmentID || result.appointmentID,
                startTimeStr,
                name,
                result.reminderSuggestion
            );
        } else {
            showAlert("Lỗi: " + result.message);
        }
    } catch (e) {
        console.error("Fetch error:", e);
        showAlert("⚠️ Lỗi kết nối Server. Vui lòng kiểm tra API!");
    }
}

async function addReminderAuto(appointmentId, reminderTime) {
    const reminderData = {
        appointmentID: appointmentId,
        reminderTime: reminderTime,
        message: "Nhắc nhở lịch hẹn tự động"
    };

    try {
        const response = await fetch("https://localhost:7075/api/appointments/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reminderData)
        });

        const res = await response.json();
        if (res.success) {
            showAlert("🔔 Đã thiết lập bộ nhắc thành công!");
            await loadDataFromApi();
        }
    } catch (e) {
        console.error("Lỗi thêm bộ nhắc:", e);
    }
}

async function confirmAddReminder(appId, rTime, rMsg) {
    const reminderData = {
        appointmentID: Number(appId),
        reminderTime: rTime,
        message: rMsg.trim()
    };

    try {
        const response = await fetch(`${API_BASE_URL}/reminders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reminderData)
        });

        const res = await response.json();

        if (res.data && res.data.reminderID) {
            showAlert("✅ Đã cài đặt bộ nhắc thành công!");
            await loadDataFromApi();
        } else {
            showAlert("⚠️ " + (res.message || "Không thể thiết lập bộ nhắc."));
        }
    } catch (e) {
        console.error("Lỗi xử lý Response:", e);
        showAlert("❌ Có lỗi xảy ra khi kết nối tới máy chủ.");
    }
}

function showReminderSetupForm(appId, startTime, appName, suggestion) {
    const rMsgDefault = suggestion?.message || `Nhắc nhở: ${appName}`;

    const html = `
        <div style="text-align: left;">
            <p style="color: #27ae60; font-weight: bold; margin-bottom: 10px;">✅ Lưu lịch hẹn thành công!</p>
            <p>Bạn muốn được nhắc trước bao lâu?</p>
            <div style="background: #f4f7f6; padding: 15px; border-radius: 8px; border: 1px solid #ddd; margin-top: 10px;">
                <label style="display:block; margin-bottom: 5px; font-weight: bold;">⏰ Chọn thời gian nhắc:</label>
                <select id="reminder-offset" style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;">
                    <option value="5">Trước 5 phút</option>
                    <option value="15" selected>Trước 15 phút</option>
                    <option value="30">Trước 30 phút</option>
                    <option value="60">Trước 1 tiếng</option>
                </select>
                
                <label style="display:block; margin-bottom: 5px; font-weight: bold;">📝 Nội dung lời nhắc:</label>
                <textarea id="quick-reminder-msg" rows="2" 
                          style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">${rMsgDefault}</textarea>
            </div>
        </div>
    `;

    showDialog("🔔 Cài đặt nhắc nhở", html, [
        { text: "Bỏ qua", className: "btn-cancel", callback: null },
        {
            text: "Xác nhận",
            className: "btn-confirm",
            callback: () => {
                const offset = parseInt(document.getElementById('reminder-offset').value);
                const msg = document.getElementById('quick-reminder-msg').value;
                const startDT = new Date(startTime);
                startDT.setMinutes(startDT.getMinutes() - offset);

                const year = startDT.getFullYear();
                const month = String(startDT.getMonth() + 1).padStart(2, '0');
                const day = String(startDT.getDate()).padStart(2, '0');
                const hours = String(startDT.getHours()).padStart(2, '0');
                const minutes = String(startDT.getMinutes()).padStart(2, '0');

                const finalReminderTime = `${year}-${month}-${day}T${hours}:${minutes}:00`;

                confirmAddReminder(appId, finalReminderTime, msg);
            }
        }
    ]);
}

async function deleteApp(id) {
    showConfirm("Bạn chắc chắn muốn xóa?", async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/${id}`, { method: "DELETE" });
            const result = await res.json();
            if (result.success) await loadDataFromApi();
        } catch (e) { showAlert("Không thể xóa."); }
    });
}

// --- 4. CHI TIẾT & HỖ TRỢ ---

async function viewDetail(id) {
    const app = appointments.find(a => (a.appointmentID == id || a.id == id));
    if (!app) return;

    const startDT = new Date(app.startTime);
    const endDT = new Date(app.endTime);
    const dateStr = startDT.toLocaleDateString('vi-VN');
    const startTime = startDT.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const endTime = endDT.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const participants = app.participants || [];

    let participantsTable = `
        <div style="margin-top: 18px; width: 100%;">
            <strong style="display: block; margin-bottom: 10px; color: #3498db; white-space: nowrap;">
                👥 Danh sách người tham gia (${participants.length})
            </strong>
            <div style="border: 1px solid #eee; border-radius: 8px; overflow-x: auto; max-height: 200px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 400px;">
                    <thead>
                        <tr style="background-color: #f8f9fa; text-align: left; white-space: nowrap;">
                            <th style="padding: 10px; border-bottom: 1px solid #eee; width: 45px; text-align: center;">STT</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee;">Họ và Tên</th>
                            <th style="padding: 10px; border-bottom: 1px solid #eee;">Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${participants.length > 0 ? participants.map((p, index) => `
                            <tr style="white-space: nowrap;">
                                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; color: #888;">${index + 1}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: 500;">${p.name}</td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #555;">${p.email}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="3" style="padding:15px; text-align:center; color:#999;">Không có người tham gia</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const firstReminder = app.reminders && app.reminders.length > 0 ? app.reminders[0] : null;

    const detailHtml = `
        <div style="text-align: left; line-height: 1.6;">
            <p style="white-space: nowrap;"><strong>📍 Địa điểm:</strong> ${app.location || 'Chưa xác định'}</p>
            <div style="background: #fdfdfd; padding: 10px; border-radius: 6px; border: 1px solid #f0f0f0;">
                <p style="margin: 0; white-space: nowrap;"><strong>📅 Ngày:</strong> ${dateStr}</p>
                <p style="margin: 5px 0 0 0; white-space: nowrap;"><strong>🕒 Thời gian:</strong> 
                    <span style="color: #27ae60;">${startTime}</span> - <span style="color: #e74c3c;">${endTime}</span>
                </p>
            </div>
            <p style="margin-top: 10px; white-space: nowrap;"><strong>🔔 Trạng thái:</strong> ${app.isGroupMeeting ? 'Họp nhóm' : 'Cá nhân'}</p>
            <p><strong>📝 Nhắc nhở:</strong> <em style="color: #666;">${firstReminder ? firstReminder.message : 'Không có'}</em></p>
            ${participantsTable}
        </div>
    `;

    showDialog(app.name, detailHtml, [
        { text: "Đóng", className: "btn-confirm", callback: null },
        { text: "Sửa lịch", className: "btn-edit", callback: () => editApp(app.appointmentID || app.id) }
    ]);
}
function renderAppointments() {
    const tbody = document.getElementById('appointment-list');
    if (!tbody) return;
    tbody.innerHTML = appointments.length === 0 ? '<tr><td colspan="6">Trống</td></tr>' : '';

    appointments.forEach((app, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${app.appointmentID}</td>
            <td><strong>${app.name}</strong></td>
            <td>${new Date(app.startTime).toLocaleString('vi-VN')}</td>
            <td>${app.location}</td>
            <td>
                <button class="btn btn-edit" onclick="editApp('${app.appointmentID}')">Sửa</button>
                <button class="btn btn-del" onclick="deleteApp('${app.appointmentID}')">Xóa</button>
            </td>`;
        row.onclick = (e) => { if (e.target.tagName !== 'BUTTON') viewDetail(app.appointmentID); };
        tbody.appendChild(row);
    });
}

async function loadReminders() {
    try {
        const response = await fetch(`${API_BASE_URL}/reminders`); // URL API của bạn
        const result = await response.json();
        const container = document.getElementById('reminders-container');
        container.innerHTML = "";

        if (result.data && result.data.length > 0) {
            result.data.forEach(rem => {
                const date = new Date(rem.reminderTime).toLocaleString('vi-VN');
                container.innerHTML += `
                    <div class="reminder-item">
                        <h4>🔔 ${rem.message}</h4>
                        <div class="reminder-time">
                            📅 Thời gian nhắc: <strong>${date}</strong>
                        </div>
                        <p style="margin-top: 10px; font-size: 0.85em; color: #888;">
                            ID Lịch hẹn: #${rem.appointmentID}
                        </p>
                    </div>
                `;
            });
        } else {
            container.innerHTML = "<p>Không có nhắc nhở nào được cài đặt.</p>";
        }
    } catch (error) {
        console.error("Lỗi khi tải bộ nhắc:", error);
    }
}

async function openReminderListModal() {
    const modal = document.getElementById('reminder-list-modal');
    const container = document.getElementById('reminder-items-container');

    modal.style.display = 'block';
    container.innerHTML = "<p style='text-align:center;'> đang tải dữ liệu...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/reminders/all`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
            renderReminders(result.data);
        } else {
            container.innerHTML = "<p style='text-align:center; color:#888;'>Chưa có nhắc nhở nào được cài đặt.</p>";
        }
    } catch (error) {
        console.error("Lỗi khi lấy bộ nhắc:", error);
        container.innerHTML = "<p style='color:red; text-align:center;'>Không thể kết nối đến máy chủ.</p>";
    }
}
function closeReminderListModal() {
    document.getElementById('reminder-list-modal').style.display = 'none';
}

function renderReminders(reminders) {
    const container = document.getElementById('reminder-items-container');

    container.innerHTML = reminders.map(rem => {
        const time = new Date(rem.reminderTime).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        return `
            <div class="reminder-card" style="border-left: 5px solid #f39c12; background: #fff9f1; padding: 12px; margin-bottom: 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <strong style="color: #d35400; font-size: 1.1em;">🔔 ${rem.message}</strong>
                        <div style="margin-top: 5px; font-size: 0.9em; color: #555;">
                            ⏰ Nhắc lúc: <b>${time}</b>
                        </div>
                    </div>
                   
                </div>
            </div>
        `;
    }).join('');
}

function editApp(id) {
    const app = appointments.find(a => a.appointmentID == id);
    if (!app) return;

    openModal();
    document.getElementById('modal-title').innerText = "Chỉnh sửa Lịch Hẹn";
    document.getElementById('edit-id').value = app.appointmentID;
    document.getElementById('event-name').value = app.name;
    document.getElementById('event-location').value = app.location;
    document.getElementById('start-time').value = app.startTime.slice(0, 16);
    document.getElementById('end-time').value = app.endTime.slice(0, 16);

    const typeValue = app.isGroupMeeting ? "true" : "false";
    const radio = document.querySelector(`input[name="meeting-type"][value="${typeValue}"]`);
    if (radio) radio.checked = true;
}

function showDialog(title, message, buttons) {
    const overlay = document.getElementById('custom-dialog-overlay');
    document.getElementById('dialog-title').innerText = title;
    document.getElementById('dialog-message').innerHTML = message;
    const footer = document.getElementById('dialog-footer');
    footer.innerHTML = '';
    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.innerText = btn.text;
        b.className = 'btn-dialog ' + btn.className;
        b.onclick = () => { overlay.style.display = 'none'; if (btn.callback) btn.callback(); };
        footer.appendChild(b);
    });
    overlay.style.display = 'flex';
}

function showConfirm(msg, yesCallback, yesText = "Đồng ý") {
    showDialog("Xác nhận", msg, [
        { text: "Để sau", className: "btn-cancel", callback: null },
        { text: yesText, className: "btn-confirm", callback: yesCallback }
    ]);
}

function showAlert(msg) {
    showDialog("Thông báo", msg, [{ text: "OK", className: "btn-confirm" }]);
}

window.onload = () => {
    loadDataFromApi();
    updateClock();
};