import React, { useState, useEffect } from 'react';
import { Page, Input, Button } from 'zmp-ui';
import * as apis from 'zmp-sdk/apis';  // Fix as namespace import

const AdminPage = () => {
  const [userId, setUserId] = useState('');
  const [dates, setDates] = useState('');
  const [hours, setHours] = useState('');

  useEffect(() => {
    // @ts-ignore
    apis.user.getUserInfo().then((info) => {
      setUserId(info.userInfo.userId);  // Fix type: info.userInfo.userId
    });
  }, []);

  if (userId !== 'admin123') return <p>Không có quyền admin</p>;

  const handleUpdate = () => {
    fetch('https://your-backend.vercel.app/api/update-rest', {
      method: 'POST',
      body: JSON.stringify({ userId, dates: dates.split(','), hours: hours.split(',').map(Number) })
    }).then(() => alert('Cập nhật nghỉ thành công'));
  };

  return (
    <Page>
      <h2>Admin Cấu hình Nghỉ</h2>
      <Input label="Ngày nghỉ (YYYY-MM-DD, cách ,)" value={dates} onChange={(e) => setDates(e.target.value)} />
      <Input label="Giờ nghỉ (0-23, cách ,)" value={hours} onChange={(e) => setHours(e.target.value)} />
      <Button onClick={handleUpdate}>Lưu</Button>
    </Page>
  );
};

export default AdminPage;