SELECT from_stop_id,
       to_stop_id,
       transfer_type,
       min_transfer_time
FROM transfers
WHERE to_stop_id = ?
