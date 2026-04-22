export default {
	filenameBase: 'fare_attributes',
	schema: [
		{
			name: 'fare_id',
			type: 'varchar(255)',
			required: true,
			primary: true
		},
		{
			name: 'price',
			type: 'real',
			required: true
		},
		{
			name: 'currency_type',
			type: 'varchar(255)',
			required: true
		},
		{
			name: 'payment_method',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 1
		},
		{
			name: 'transfers',
			type: 'tinyint unsigned',
			required: true,
			min: 0,
			max: 2
		},
		{
			name: 'agency_id',
			type: 'varchar(16)',
			required: true
		},
		{
			name: 'transfer_duration',
			type: 'tinyint unsigned',
			min: 0
		}
	]
};
