import React, { useEffect, useRef, useState } from 'react';
import { Page, List, Button, Text, Icon, Modal, Box } from 'zmp-ui';
import { useNavigate } from 'zmp-ui';
import dayjs from 'dayjs';

// Import các API từ Zalo SDK
import { 
  showToast, 
  Payment, 
  events, 
  EventName, 
  getPhoneNumber, 
  getAccessToken, 
  getUserInfo 
} from 'zmp-sdk/apis';

import { useAtom } from 'jotai';
import { selectedSlotsAtom, userAtom, Slot } from '../store/cart';

const SUCCESS_DATA_KEY = 'pes_success_data';
const SUCCESS_LOCK_KEY = 'pes_success_locked';
const FINAL_SLOTS_KEY = 'pes_final_slots';
const LAST_BOOKING_ID_KEY = 'last_booking_id';
const REDIRECT_PATH = '/payment-result';

const SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [selectedSlots, setSelectedSlots] = useAtom(selectedSlotsAtom);
  const [user, setUser] = useAtom(userAtom); 
  
  // State cho Modal và Loading
  const [visiblePhoneModal, setVisiblePhoneModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const latestSelectedSlots = useRef(selectedSlots);

  // Sync ref
  useEffect(() => {
    latestSelectedSlots.current = selectedSlots;
  }, [selectedSlots]);

  // Clean storage khi vào trang
  useEffect(() => {
    localStorage.removeItem(FINAL_SLOTS_KEY);
    localStorage.removeItem(LAST_BOOKING_ID_KEY);
  }, []);

  // === Helper: Hủy reserve cũ ===
  const cancelPreviousReserve = async (userIdToCheck: string) => {
    if (!userIdToCheck) return;
    try {
      await fetch('https://pes-pickleball-backend.vercel.app/api/cancel-reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdToCheck })
      });
      console.log('Đã hủy giữ chỗ cũ');
    } catch (err) {
      console.error('Hủy reserve error:', err);
    }
  };

  // Effect: Gọi hủy reserve khi component mount
  useEffect(() => {
    if (user.id) {
        cancelPreviousReserve(user.id);
    }
  }, [user.id]);

  // === Các hàm tiện ích LocalStorage ===
  const saveSuccessDataOnce = (successData: any) => {
    if (localStorage.getItem(SUCCESS_LOCK_KEY)) {
      console.log('Success data đã bị lock, bỏ qua overwrite');
      return;
    }
    localStorage.setItem(SUCCESS_DATA_KEY, JSON.stringify(successData));
    localStorage.setItem(SUCCESS_LOCK_KEY, 'true');
    console.log('Lưu successData lần đầu thành công:', successData);
    
    setTimeout(() => {
      localStorage.removeItem(SUCCESS_LOCK_KEY);
      localStorage.removeItem(SUCCESS_DATA_KEY);
      localStorage.removeItem(FINAL_SLOTS_KEY);
      localStorage.removeItem(LAST_BOOKING_ID_KEY);
    }, 600000);
  };

  const clearTempKeys = () => {
    localStorage.removeItem(SUCCESS_LOCK_KEY);
    localStorage.removeItem(SUCCESS_DATA_KEY);
    localStorage.removeItem(FINAL_SLOTS_KEY);
    localStorage.removeItem(LAST_BOOKING_ID_KEY);
    console.log('Đã xóa temp keys do fail/hủy thanh toán');
  };

  // === Xử lý sự kiện OpenApp và PaymentClose ===
  useEffect(() => {
    const handleOpenApp = (data: any) => {
      console.log('OpenApp event received:', data);
      const path = data?.path || '';

      if (path.includes(REDIRECT_PATH)) {
        console.log('Checking transaction from OpenApp...');

        Payment.checkTransaction({
          data: path,
          success: async (rs) => {
            console.log('checkTransaction success:', rs);

            if (rs.resultCode === 1 || rs.msg?.toLowerCase().includes('thành công')) {
              try {
                // Fallback user id
                const currentUserId = user.id || 'unknown_user';
                const transId = rs.transId || rs.orderId || 'N/A';
                const bookingIdFromLocal = localStorage.getItem(LAST_BOOKING_ID_KEY) || '';

                showToast({ message: 'Thanh toán thành công! Đang lấy chi tiết...' });

                const response = await fetch(
                  `https://pes-pickleball-backend.vercel.app/api/get-booking?userId=${currentUserId}&transId=${transId}&bookingId=${bookingIdFromLocal}`
                );
                const result = await response.json();

                let successData;
                if (result.success && result.booking) {
                  successData = {
                    bookingId: result.booking.booking_id,
                    totalPrice: result.booking.totalPrice,
                    selectedSlots: result.booking.selectedSlots,
                  };
                } else {
                  const storedFinal = localStorage.getItem(FINAL_SLOTS_KEY);
                  const finalSlots = storedFinal ? JSON.parse(storedFinal) : latestSelectedSlots.current;
                  successData = {
                    bookingId: transId,
                    totalPrice: finalSlots.reduce((sum: number, slot: Slot) => sum + slot.price, 0),
                    selectedSlots: [...finalSlots],
                  };
                }

                showToast({ message: `Thanh toán thành công!` });
                saveSuccessDataOnce(successData);
                navigate('/success', { state: successData });
                setSelectedSlots([]);
                localStorage.removeItem(LAST_BOOKING_ID_KEY);
              } catch (err) {
                console.error('Fetch booking error:', err);
                showToast({ message: 'Lỗi lấy chi tiết đơn hàng' });
                clearTempKeys();
              }
            } else if (rs.resultCode === 0) {
              showToast({ message: 'Giao dịch đang xử lý...' });
              setTimeout(() => Payment.checkTransaction({ data: path }), 8000);
            } else {
              showToast({ message: `Thanh toán thất bại` });
              clearTempKeys();
            }
          },
          fail: (err) => {
            console.error('checkTransaction fail:', err);
            showToast({ message: 'Lỗi kiểm tra giao dịch' });
            clearTempKeys();
          }
        });
      }
    };

    const handlePaymentClose = (data: any) => {
      console.log('PaymentClose event:', data);
      if (data?.resultCode === 1) {
        showToast({ message: 'Thanh toán thành công' });
        const storedFinal = localStorage.getItem(FINAL_SLOTS_KEY);
        const finalSlots = storedFinal ? JSON.parse(storedFinal) : latestSelectedSlots.current;
        const successData = {
          transId: 'N/A',
          totalPrice: finalSlots.reduce((sum: number, slot: Slot) => sum + slot.price, 0),
          selectedSlots: [...finalSlots],
        };
        saveSuccessDataOnce(successData);
        navigate('/success', { state: successData });
        setSelectedSlots([]);
        localStorage.removeItem(FINAL_SLOTS_KEY);
      } else {
        showToast({ message: 'Đã hủy hoặc lỗi thanh toán' });
        clearTempKeys();
      }
    };

    events.on(EventName.OpenApp, handleOpenApp);
    events.on(EventName.PaymentClose, handlePaymentClose);

    return () => {
      events.off(EventName.OpenApp, handleOpenApp);
      events.off(EventName.PaymentClose, handlePaymentClose);
    };
  }, [navigate, setSelectedSlots, user.id]);

  // === Thao tác Giỏ hàng ===
  const removeSlot = (removedSlot: Slot) => {
    const updatedSlots = selectedSlots.filter(s => !(s.id === removedSlot.id && s.date === removedSlot.date));
    setSelectedSlots(updatedSlots);
    showToast({ message: 'Đã bỏ slot!' });
    if (user.id) cancelPreviousReserve(user.id);

    if (updatedSlots.length === 0) {
      showToast({ message: 'Giỏ hàng rỗng, quay về chọn lại!' });
      navigate(-1);
    }
  };

  const clearCart = () => {
    if (window.confirm('Xóa toàn bộ giỏ hàng?')) {
      setSelectedSlots([]);
      showToast({ message: 'Đã xóa toàn bộ giỏ hàng' });
      if (user.id) cancelPreviousReserve(user.id);
      navigate(-1);
    }
  };

  // ==========================================================
  // LOGIC THANH TOÁN
  // ==========================================================

  // 1. Hàm tạo Order và gọi ZaloPay (Được gọi sau khi đã xác định Phone)
  // [FIX]: Chấp nhận kiểu string | null | undefined để tránh lỗi TypeScript
  const createOrderAndPay = async (finalPhone: string | null | undefined) => {
    try {
      const currentUserId = user.id;
      const currentUserName = user.name; 

      console.log('[Step] Creating Order with phone:', finalPhone || 'GUEST');
      
      localStorage.setItem(FINAL_SLOTS_KEY, JSON.stringify(selectedSlots));
      
      const orderId = crypto.randomUUID();
      const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);

      // Gọi API create-order
      const response = await fetch('https://pes-pickleball-backend.vercel.app/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          phone: finalPhone, // Backend sẽ nhận null nếu finalPhone là null/undefined
          name: currentUserName, 
          selectedSlots,
          amount: totalPrice.toString(),
          desc: 'Đặt sân Pickleball',
          orderId
        })
      });
      
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Create order API failed');

      localStorage.setItem(LAST_BOOKING_ID_KEY, data.orderId);

      // Gọi SDK Thanh toán
      console.log('[Step] Calling Zalo Payment SDK...');
      Payment.createOrder({
        desc: 'Đặt sân Pickleball',
        item: selectedSlots.map(slot => ({ id: slot.id.toString(), amount: slot.price })),
        amount: totalPrice.toString(),
        extradata: JSON.stringify({
          userId: currentUserId,
          // [FIX]: Đảm bảo luôn là string khi gọi SDK
          phone: finalPhone || '', 
          name: currentUserName,
          notes: 'Extra data from booking'
        }),
        method: JSON.stringify({ id: "VNPAY_SANDBOX", isCustom: false }),
        mac: data.mac,
        success: (res) => {
          console.log('[Success] Zalo Payment Order Created:', res);
          showToast({ message: 'Đang chuyển sang thanh toán...' });
          
          fetch('https://pes-pickleball-backend.vercel.app/api/update-zalo-orderid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: data.orderId, zaloOrderId: res.orderId })
          }).catch(e => console.error('[Error] Update Zalo OrderID failed:', e));
        },
        fail: (err) => {
          console.error('[Error] Zalo Payment SDK Failed:', err);
          showToast({ message: 'Tạo thanh toán thất bại: ' + (err.message || 'Lỗi SDK') });
          clearTempKeys();
        }
      });

    } catch (err: any) {
      console.error('[Error] Payment Flow Exception:', err);
      showToast({ message: 'Có lỗi xảy ra: ' + err.message });
      clearTempKeys();
    } finally {
      setIsProcessing(false); // Kết thúc xử lý
    }
  };

  // 2. Xử lý khi bấm nút "Đăng ký" ở Modal
  const handleModalRegister = async () => {
    setVisiblePhoneModal(false); // Đóng modal
    showToast({ message: 'Đang lấy thông tin...' });

    // [FIX]: Khai báo kiểu rõ ràng để có thể gán null
    let finalPhone: string | null | undefined = user.phone;

    try {
      const { token: phoneToken } = await getPhoneNumber({});
      const accessToken = await getAccessToken({});
      
      const updateRes = await fetch('https://pes-pickleball-backend.vercel.app/api/update-phone', {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json', 
              'access_token': accessToken 
          },
          body: JSON.stringify({ userId: user.id, token: phoneToken })
      });
      
      const phoneData = await updateRes.json();
      if (phoneData.success) {
          finalPhone = phoneData.phone;
          // Cập nhật state nếu thành công
          setUser(prev => ({ ...prev, phone: phoneData.phone })); 
          console.log('[Info] Phone updated:', finalPhone);
      } else {
          // Nếu lỗi API, fallback về Guest (null)
          console.warn('Update phone failed, fallback to Guest');
          finalPhone = null;
      }
    } catch (err) {
      // Nếu user từ chối cấp quyền hoặc lỗi SDK -> Fallback về Guest (null)
      console.warn('User denied phone permission or SDK error. Using Guest mode.');
      finalPhone = null;
    }

    // Tiếp tục thanh toán
    createOrderAndPay(finalPhone);
  };

  // 3. Hàm kích hoạt (Nút "Xác nhận & Thanh toán")
  const handlePaymentInitiate = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // --- BƯỚC 1: ĐẢM BẢO CÓ USER ID ---
      let currentUserId = user.id;
      if (!currentUserId) {
        console.log('[Warning] User state lost. Attempting to recover...');
        try {
          const userInfo: any = await new Promise((resolve, reject) => {
            getUserInfo({
              success: (data) => resolve(data.userInfo),
              fail: (err) => reject(err),
            });
          });
          currentUserId = userInfo.id;
          setUser(prev => ({ 
              ...prev, 
              id: userInfo.id, 
              name: userInfo.name, 
              avatar: userInfo.avatar 
          }));
        } catch (err) {
          showToast({ message: 'Lỗi: Không thể xác thực người dùng.' });
          setIsProcessing(false);
          return;
        }
      }

      // --- BƯỚC 2: Reserve Slots (Giữ chỗ) ---
      console.log('[Step] Reserving slots...');
      const reserveResponse = await fetch('https://pes-pickleball-backend.vercel.app/api/reserve-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, selectedSlots })
      });
      const reserveData = await reserveResponse.json();
      
      if (!reserveData.success) {
        showToast({ message: reserveData.error || 'Slot đã bị người khác đặt!' });
        setIsProcessing(false);
        return;
      }
      
      showToast({ message: 'Đã giữ chỗ thành công!' });

      // --- BƯỚC 3: KIỂM TRA SỐ ĐIỆN THOẠI ---
      // Nếu chưa có (null hoặc rỗng) -> Hiện Modal
      const isPhoneMissing = !user.phone;

      if (isPhoneMissing) {
        setVisiblePhoneModal(true);
        // Lưu ý: Không set isProcessing = false ở đây, giữ trạng thái loading đến khi Modal xử lý xong
      } else {
        // Đã có phone xịn -> Thanh toán luôn
        // [FIX]: Hàm createOrderAndPay giờ đã nhận kiểu undefined nên không bị lỗi ở đây nữa
        createOrderAndPay(user.phone);
      }

    } catch (err: any) {
      console.error('[Error] Initiate Exception:', err);
      showToast({ message: 'Lỗi khởi tạo: ' + err.message });
      setIsProcessing(false);
    }
  };

  // === RENDER UI ===
  if (selectedSlots.length === 0) {
    return (
      <Page className="flex flex-col items-center justify-center h-full bg-gray-50">
        <Text className="text-xl font-semibold text-gray-600 mb-4">
          Không có slot nào được chọn
        </Text>
        <Button color="primary" onClick={() => navigate(-1)}>
          Quay lại chọn slot
        </Button>
      </Page>
    );
  }

  const groupedByDate = selectedSlots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const totalSlots = selectedSlots.length;
  const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0);

  return (
    <Page className="bg-gray-50 min-h-screen">
      <div className="p-4 pb-24">
        <Text.Title className="text-center text-2xl font-bold mb-6 text-blue-800">
          Xác nhận đặt sân Pickleball
        </Text.Title>

        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex items-center mb-3">
            <Icon icon="zi-location-solid" className="text-blue-600 mr-3 text-2xl" />
            <Text.Title className="text-lg font-semibold">PES Pickleball</Text.Title>
          </div>
          <Text className="text-gray-700 mb-2">
            Địa chỉ: số 239 Đường Nguyễn Trãi, Phường Tân Ninh, Tây Ninh
          </Text>
          <Text className="text-sm text-gray-500">
            Quy định: Hủy trước 24h được hoàn 100%, sau 24h không hoàn tiền. Vui lòng đến đúng giờ.
          </Text>
        </div>

        <div className="flex justify-between items-center mb-4">
          <Text.Title className="font-bold text-lg text-gray-800">
            Các khung giờ đã chọn ({totalSlots} slot)
          </Text.Title>
          <Button
            color="red"
            variant="secondary"
            size="small"
            onClick={clearCart}
          >
            Xóa giỏ hàng
          </Button>
        </div>

        {Object.entries(groupedByDate)
          .sort(([dateA], [dateB]) => dayjs(dateA).diff(dayjs(dateB)))
          .map(([date, slots]) => (
            <div key={date} className="bg-white rounded-xl shadow-sm p-4 mb-5">
              <Text.Title className="font-semibold text-base mb-3 text-blue-700">
                {dayjs(date).format('dddd, DD/MM/YYYY')}
              </Text.Title>
              <List divider>
                {slots.map((slot, index) => (
                  <List.Item key={index}>
                    <div className="flex justify-between items-center py-1">
                      <Text className="text-gray-800">{slot.time}</Text>
                      <div className="flex items-center">
                        <Text className="font-medium text-green-600 mr-4">
                          {slot.price.toLocaleString('vi-VN')}đ
                        </Text>
                        <Button
                          variant="secondary"
                          size="small"
                          icon={<Icon icon="zi-close" />}
                          onClick={() => removeSlot(slot)}
                        >
                          Bỏ
                        </Button>
                      </div>
                    </div>
                  </List.Item>
                ))}
              </List>
            </div>
          ))}

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <Text.Title className="text-lg font-semibold text-gray-800">Tổng thanh toán</Text.Title>
              <Text className="text-sm text-gray-600">({totalSlots} slot)</Text>
            </div>
            <Text.Title className="text-2xl font-bold text-indigo-700">
              {totalPrice.toLocaleString('vi-VN')}đ
            </Text.Title>
          </div>
        </div>

        <Text className="text-sm text-gray-500 text-center mb-6">
          Vui lòng kiểm tra kỹ thông tin trước khi thanh toán. Hệ thống sẽ gửi mã xác nhận qua tin nhắn sau khi thanh toán thành công.
        </Text>
      </div>

      {/* --- MODAL XIN SỐ ĐIỆN THOẠI (DESIGN MỚI - CHUYÊN NGHIỆP) --- */}
      <Modal
        visible={visiblePhoneModal}
        // Xóa các props mặc định 'title', 'actions' để tự do thiết kế
        onClose={() => {
            setVisiblePhoneModal(false);
            // Nếu đóng (bấm ra ngoài) -> Coi như khách vãng lai
            console.log('User đóng Modal -> Guest Mode');
            createOrderAndPay(null); 
        }}
        maskClosable={false}
      >
        <Box className="flex flex-col items-center p-2">
            {/* 1. ICON MINH HỌA */}
            <div className="bg-blue-50 p-4 rounded-full mb-4">
                <Icon icon="zi-call-solid" className="text-blue-600 text-5xl" />
            </div>

            {/* 2. TIÊU ĐỀ */}
            <Text.Title className="text-xl font-bold text-gray-800 mb-2 text-center">
                Chúng tôi cần số điện thoại của bạn
            </Text.Title>

            {/* 3. MÔ TẢ */}
            <Text className="text-gray-500 text-center mb-6 text-base leading-relaxed">
                Chúng tôi cần số điện thoại của bạn để đăng ký thành viên, xác nhận đặt sân.
            </Text>

            {/* 4. BUTTON CHÍNH: ĐỒNG Ý */}
            <Button
                fullWidth
                size="large"
                onClick={handleModalRegister}
                className="mb-4 bg-blue-600 hover:bg-blue-700 shadow-lg font-semibold"
            >
                Đồng ý & Tiếp tục
            </Button>

            {/* 5. LINK PHỤ: BỎ QUA */}
            <div 
                onClick={() => {
                    setVisiblePhoneModal(false);
                    console.log('User chọn Bỏ qua -> Guest Mode');
                    createOrderAndPay(null);
                }}
                className="w-full text-center py-2 cursor-pointer active:opacity-50"
            >
                <Text className="text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors">
                    Bỏ qua, tôi muốn đặt vãng lai
                </Text>
            </div>
        </Box>
      </Modal>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex gap-4 z-10">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => navigate(-1)}
          className="flex-1"
        >
          Quay lại chỉnh sửa
        </Button>
        <Button
          color="primary"
          fullWidth
          loading={isProcessing} // Hiện loading khi đang xử lý
          onClick={handlePaymentInitiate}
          className="flex-1"
        >
          Xác nhận & Thanh toán
        </Button>
      </div>
    </Page>
  );
};

export default SummaryPage;