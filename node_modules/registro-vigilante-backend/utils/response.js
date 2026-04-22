
export const success = (res, data) => res.status(200).json({ success:true, data, error:null });
export const error = (res, msg, code=400) => res.status(code).json({ success:false, data:null, error:msg });
