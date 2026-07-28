export async function sendParcelEmailNotification(parcel: any, status: string) {
  const { awbNumber, senderName, senderEmail, receiverName, receiverEmail } = parcel;

  const recipients = [];
  if (senderEmail) recipients.push(senderEmail);
  if (receiverEmail) recipients.push(receiverEmail);

  if (recipients.length === 0) {
    console.log(`No emails provided for parcel ${awbNumber}, skipping notification.`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not defined, email notification skipped.");
    return;
  }

  let subject = "";
  let html = "";

  if (status === "RECEIVED_AT_DESTINATION") {
    subject = `Parcel ${awbNumber} Reached Destination Hub`;
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4F46E5;">Parcel Status Update</h2>
        <p>Hello ${senderName} / ${receiverName},</p>
        <p>Your parcel with AWB Number <strong>${awbNumber}</strong> has reached the destination hub.</p>
        <p>Thank you for choosing Transport Manager!</p>
      </div>
    `;
  } else if (status === "DELIVERED") {
    subject = `Parcel ${awbNumber} Delivered Successfully`;
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #10B981;">Parcel Status Update</h2>
        <p>Hello ${senderName} / ${receiverName},</p>
        <p>Your parcel with AWB Number <strong>${awbNumber}</strong> has been successfully delivered and received by the receiver.</p>
        <p>Thank you for choosing Transport Manager!</p>
      </div>
    `;
  } else if (status === "DISPATCHED") {
    subject = `Parcel ${awbNumber} Dispatched (In Transit)`;
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #F59E0B;">Parcel Status Update</h2>
        <p>Hello ${senderName} / ${receiverName},</p>
        <p>Your parcel with AWB Number <strong>${awbNumber}</strong> has been dispatched and is currently in transit towards its destination.</p>
        <p>Thank you for choosing Transport Manager!</p>
      </div>
    `;
  } else if (status === "BOOKED") {
    subject = `Parcel ${awbNumber} Booking Confirmed`;
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #3B82F6;">Parcel Booking Confirmed</h2>
        <p>Hello ${senderName} / ${receiverName},</p>
        <p>Your parcel with AWB Number <strong>${awbNumber}</strong> has been successfully booked.</p>
        <p>Thank you for choosing Transport Manager!</p>
      </div>
    `;
  } else {
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Transport Manager <notifications@gen-tech.in>",
        to: recipients,
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send email via Resend: ${response.status} - ${errorText}`);
    } else {
      console.log(`Email notification sent successfully to ${recipients.join(", ")} for parcel ${awbNumber} (${status})`);
    }
  } catch (error) {
    console.error("Error calling Resend API:", error);
  }
}
