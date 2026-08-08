import { format } from "date-fns";

export function Receipt({ parcel }: { parcel: any }) {
  if (!parcel) return null;

  return (
    <div className="receipt-container w-full max-w-4xl mx-auto p-4 text-sm" style={{ fontFamily: 'sans-serif', backgroundColor: '#ffffff', color: '#000000' }}>
      <style>{`
        .receipt-container .border-black { border-color: #000000 !important; }
        .receipt-container .border-green-600 { border-color: #16a34a !important; }
        .receipt-container .border-indigo-500 { border-color: #6366f1 !important; }
        .receipt-container .text-red-600 { color: #dc2626 !important; }
        .receipt-container .bg-red-600 { background-color: #dc2626 !important; }
        .receipt-container .text-white { color: #ffffff !important; }
        .receipt-container .text-black { color: #000000 !important; }
        .receipt-container .bg-white { background-color: #ffffff !important; }
      `}</style>
        {/* Header */}
        <div className="border border-black flex flex-col">
          <div className="flex justify-between items-start border-b border-black p-2 text-indigo-900" style={{ color: '#312e81' }}>
            <div className="text-left text-[14px] font-bold italic font-serif w-1/4 pt-2">
              Daily Parcel Service
            </div>
            <div className="text-center flex-1 px-2 flex flex-col items-center">
               <div className="w-12 h-12 flex items-center justify-center mb-1">
                 <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-indigo-900" style={{ color: '#312e81' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <circle cx="12" cy="12" r="5" />
                 </svg>
               </div>
              <h1 className="text-[22px] font-bold tracking-wider mb-1" style={{ color: '#312e81', fontFamily: 'serif' }}>NEW BALAJI LORRY SERVICE</h1>
              <div className="border border-indigo-900 rounded-full px-4 py-0.5 text-[14px] font-bold mb-1 tracking-wide" style={{ borderColor: '#312e81' }}>
                HYDERABAD TO BHONGIR, MOTHKUR
              </div>
              <p className="text-[13px] font-semibold tracking-wide">Maharaj Gunj, Hyderabad-500012.</p>
              <p className="text-[15px] font-bold mt-1 tracking-wide">This Receipt Valid for 3 Days Only</p>
            </div>
            <div className="text-right text-[15px] font-bold w-1/4 pt-2">
              Cell : 9966763333
            </div>
          </div>

        {/* Details Section */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-2 space-y-2">
            <div className="flex gap-2">
              <span className="font-semibold">LR Number:</span>
              <span className="font-bold">{parcel.awbNumber}</span>
            </div>
            <div>
              <span className="font-semibold">From: </span>
              {parcel.sourceHubCode}, {parcel.senderPhone}
            </div>
            <div>
              <span className="font-semibold">Consignor: </span>
              {parcel.senderName}, {parcel.senderAddress}
            </div>
          </div>
          <div className="p-2 space-y-2">
            <div className="flex gap-2">
              <span className="font-semibold">Booking Time:</span>
              <span>{parcel.createdAt ? format(new Date(parcel.createdAt), "dd/MMM/yyyy h:mm a") : ''}</span>
            </div>
            <div>
              <span className="font-semibold">To: </span>
              {parcel.destinationHubCode}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="min-h-[200px] flex flex-col relative">
          <div className="grid grid-cols-12 border-b border-black font-semibold text-center text-xs">
            <div className="col-span-2 p-1 border-r border-black">Quantity</div>
            <div className="col-span-7 p-1 border-r border-black">Description (Said To Contain)</div>
            <div className="col-span-3 p-1">Weight</div>
          </div>
          
          {parcel.items && parcel.items.length > 0 ? (
            <div className="flex-1 text-sm relative">
              {parcel.items.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 w-full">
                  <div className="col-span-2 p-2 border-r border-black text-center">{item.numBoxes}</div>
                  <div className="col-span-7 p-2 border-r border-black">{item.itemName || "Item"}</div>
                  <div className="col-span-3 p-2 text-center">
                    {item.weightKg}
                  </div>
                </div>
              ))}
              
              <div className="absolute right-[-40px] top-1/2 transform -translate-y-1/2 rotate-90 origin-right text-lg tracking-widest text-black whitespace-nowrap opacity-60 z-10">
                {parcel.paymentType ? parcel.paymentType.toUpperCase() : "TO-PAY"}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 flex-1 text-sm">
              <div className="col-span-2 p-2 border-r border-black text-center">{parcel.numBoxes}</div>
              <div className="col-span-7 p-2 border-r border-black">{parcel.itemName || "Item"}</div>
              <div className="col-span-3 p-2 text-center relative">
                {parcel.weightKg}
                
                <div className="absolute right-[-40px] top-1/2 transform -translate-y-1/2 rotate-90 origin-right text-lg tracking-widest text-black whitespace-nowrap opacity-60">
                  {parcel.paymentType ? parcel.paymentType.toUpperCase() : "TO-PAY"}
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="text-center font-bold" style={{ color: '#312e81' }}>
              <div className="text-5xl italic font-serif">New Balaji</div>
              <div className="text-4xl italic font-serif mb-2">Lorry Service</div>
            </div>
          </div>
        </div>

        {/* Totals & Remarks */}
        <div className="border-t border-black text-sm">
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-9 p-1 border-r border-black flex items-center gap-2">
              <span className="text-xs">Total:</span> <span className="font-semibold">{parcel.numBoxes}</span>
            </div>
            <div className="col-span-3 p-1 flex items-center gap-2">
              <span className="text-xs">Total:</span> <span className="font-semibold">{parcel.weightKg}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-12 border-b border-black text-xs">
            <div className="col-span-4 p-1 flex items-center justify-between border-r border-black">
              <span>Invoice#:</span> <span>---</span>
            </div>
            <div className="col-span-4 p-1 flex items-center justify-between border-r border-black">
              <span>Goods Value:</span> <span>---</span>
            </div>
            <div className="col-span-4 p-1 flex items-center justify-between">
              <span>E-way Bill#:</span> <span>---</span>
            </div>
          </div>
          
          <div className="grid grid-cols-12 border-b border-black text-sm font-semibold">
            <div className="col-span-9 p-2 border-r border-black font-normal flex flex-col justify-between">
               <div><span className="font-semibold">Remarks: </span>{parcel.remarks}</div>
               <div className="text-[10px] mt-4 font-normal">Subject to Siddipet Jurisdiction</div>
            </div>
            <div className="col-span-3">
              <div className="border-b border-black p-2 flex justify-between">
                <span>Grand</span>
                <span>{parcel.charges}</span>
              </div>
              <div className="p-2 h-10 flex items-end">
                For SDPT
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] font-bold">
          <div className="bg-red-600 text-white p-1">
            Daily Parcel Service :- SIDDIPET, DUBBAK, LACHAPET, MIRDODDI, MUSTHABAD, THOGUTA, CHERIAL, BEJJANKI, CHINNAKODUR, SHANIGARAM, ELLANTHAKUNTA
          </div>
          <div className="p-1 flex justify-between items-center text-red-600">
            <span>Booked at owners risk</span>
            <span>Not responsible for breakages and leakages</span>
            <span>Delivery charges extra</span>
            <span className="bg-red-600 text-white px-2 py-0.5 rounded ml-2">CONSIGNEE COPY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
