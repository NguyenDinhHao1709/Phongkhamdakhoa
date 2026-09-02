async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/quan-ly/nhan-vien/2', {
      headers: { 'Authorization': 'Bearer test' }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();

