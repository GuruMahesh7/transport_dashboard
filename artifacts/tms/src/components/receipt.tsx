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
        <div className="flex justify-between items-center border-b border-black p-2">
          <div className="flex flex-col items-center justify-center p-2 w-24 h-24">
            <div className="border-2 border-green-600 rounded-full w-14 h-14 flex items-center justify-center mb-1 bg-white">
              <span className="font-bold text-xl text-black">SSLS</span>
            </div>
            <span className="text-[12px] font-bold text-red-600 whitespace-nowrap">SSLS TRANSPORT</span>
          </div>
          <div className="text-center flex-1 px-4">
            <h1 className="text-2xl font-bold text-red-600 mb-1">SHIVA SHANKARA LORRY SERVICE</h1>
            <p className="text-xs font-bold text-black">BOOKING OFFICE : 15-2-449/2, Opp, Aryasamaj Building, Kishan Gunj, Hyd., Ph : 9886193455, 9392832855</p>
            <p className="text-xs font-bold text-black mt-1">H.O. : D.No. 6-1-111, Near Kaman, Siddipet. Cell : 9490200408</p>
          </div>
          <div className="text-right text-xs text-red-600 font-bold min-w-[160px] flex flex-col justify-between h-full py-2">
            <p className="text-[10px]">GSTIN. 36AMNPB0778R1ZD</p>
            <p className="text-xl mt-4">Cell : 9392832855</p>
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
          
          <div className="grid grid-cols-12 flex-1 text-sm">
            <div className="col-span-2 p-2 border-r border-black text-center">{parcel.numBoxes}</div>
            <div className="col-span-7 p-2 border-r border-black">{parcel.itemName || "Item"}</div>
            <div className="col-span-3 p-2 text-center relative">
              {parcel.weightKg}
              
              <div className="absolute right-[-40px] top-1/2 transform -translate-y-1/2 rotate-90 origin-right text-lg tracking-widest text-black whitespace-nowrap opacity-60">
                TO-PAY
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="text-center font-bold" style={{ color: '#6366f1' }}>
              <div className="text-6xl border-4 border-indigo-500 rounded-full inline-flex items-center justify-center w-32 h-32 mb-2">20</div>
              <div className="text-xl mb-2">YEARS</div>
              <div className="text-4xl italic">Shiva Shankara</div>
              <div className="text-3xl italic mb-2">Lorry Service</div>
              <div className="text-lg italic">20 years experience</div>
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
