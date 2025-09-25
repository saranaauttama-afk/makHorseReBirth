// วิธีเช็คกฎหมากฮอสไทย ก่อนเทรน Neural Network

console.log('📋 Thai Checkers Rule Validation Checklist\n');

const rules = [
  '✅ หมากเริ่มต้น: 8 ตัวต่อฝ่าย บนช่องดำ',
  '✅ การเดิน: ทแยงหน้า 1 ช่อง (หมากธรรมดา)',
  '✅ ฮอส: เดินทแยงได้หลายช่อง',
  '✅ การกิน: กระโดดข้ามศัตรู',
  '⚠️  การกินบังคับ: ต้องกินถ้ากินได้ (เช็คใน UI)',
  '⚠️  กินต่อเนื่อง: กิน 2-3 ตัวในเทิร์นเดียว',
  '⚠️  ฮอสกิน: ลงช่องถัดจากศัตรู (ไม่ใช่หลายช่อง)',
  '✅ โปรโมท: หมากถึงฝั่งตรงข้ามกลายเป็นฮอส',
  '✅ ชนะ: กินหมากศัตรูหมด หรือปิดกั้นไม่ให้เดินได้'
];

rules.forEach(rule => console.log(rule));

console.log('\n🎮 วิธีเช็คในแอป:');
console.log('1. เปิด Expo app และดู console logs');
console.log('2. เล่นเกมทดลอง - ลองสถานการณ์พิเศษ');
console.log('3. เช็คว่า red border แสดงเมื่อต้องกิน');
console.log('4. ลองกินต่อเนื่อง 2 ตัว');
console.log('5. ทดสอบฮอสกิน (ต้องลงแค่ 1 ช่องข้ามศัตรู)');

console.log('\n❗ หากพบบั๊ก:');
console.log('- อย่าเทรน neural network ก่อน');
console.log('- แก้บั๊กให้ครบถ้วน');
console.log('- รันเทสใหม่');
console.log('- เล่นทดลองอีกครั้ง');

console.log('\n✅ เมื่อกฎถูกต้อง 100% แล้ว:');
console.log('- เริ่ม Phase 3: Neural Network');
console.log('- เทรนจาก Minimax data');
console.log('- สร้าง self-play system');