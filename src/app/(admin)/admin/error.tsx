"use client";
import { Button } from "@/components/ui/button";
export default function AdminError(){return <section className="dashboard-card"><h1>دریافت اطلاعات مدیریت ممکن نشد.</h1><p role="alert">ارتباط موقتاً برقرار نیست. نتیجهٔ عملیات ارسال‌شده را با شناسهٔ قبلی بررسی کنید.</p><Button onClick={()=>window.location.reload()}>تلاش دوباره</Button></section>;}
