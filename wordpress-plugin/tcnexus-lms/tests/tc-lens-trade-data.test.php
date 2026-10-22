<?php
// Run in the local WordPress container. No posts or metadata are changed.
require '/var/www/html/wp-load.php';

function trade_check( $condition, $message ) {
	if ( ! $condition ) throw new RuntimeException( $message );
}

$row = array(
	'id' => 'trade-editor-test', 'messageType' => 'trade', 'startTime' => '00:30', 'endTime' => '',
	'trade' => array(
		'underlying' => 'AAPL', 'assetType' => 'crypto', 'quantity' => '100', 'entryPrice' => '258.11',
		'strategy' => 'Existing strategy', 'strikes' => '275, 265', 'expiration' => '2026-11-20',
		'legs' => array(
			array( 'side' => 'call', 'action' => 'sell_to_open', 'quantity' => '1', 'strike' => '275', 'expiration' => '2026-11-20', 'entryPrice' => '12.05' ),
			array( 'side' => 'put', 'action' => 'buy_to_close', 'quantity' => '2', 'strike' => '265', 'expiration' => '2026-11-20', 'entryPrice' => '20.30' ),
		),
		'assumptions' => 'Retain this context.',
	),
);
$events = TCNexus_Course_Builder::sanitize_tc_lens_timeline( array( $row ) );
trade_check( count( $events ) === 1, 'Trade event retained' );
$data = $events[0]['data'];
trade_check( 'crypto' === $data['assetType'] && 100.0 === $data['quantity'], 'Underlying type and shares retained' );
trade_check( 258.11 === $data['entryPrice'] && 20.3 === $data['legs'][1]['entryPrice'], 'Price and premium retained' );
trade_check( 'buy_to_close' === $data['legs'][1]['action'], 'Closing action retained' );
trade_check( $events === TCNexus_Course_Builder::sanitize_tc_lens_timeline( $events ), 'Normalized data survives a second save' );

$render = new ReflectionMethod( TCNexus_Course_Builder::class, 'render_tc_lens_payload_fields' );
ob_start();
$render->invoke( null, 'timeline[0]', $events[0], false );
$html = ob_get_clean();
$dom = new DOMDocument();
libxml_use_internal_errors( true );
$dom->loadHTML( '<?xml encoding="utf-8" ?>' . $html );
$xpath = new DOMXPath( $dom );
// Reconstruct browser form submission from the actual PHP-rendered controls.
$pairs = array();
foreach ( $xpath->query( '//input[@name and not(@disabled)] | //select[@name and not(@disabled)] | //textarea[@name and not(@disabled)]' ) as $field ) {
	$value = $field->getAttribute( 'value' );
	if ( 'select' === $field->tagName ) {
		$selected = $xpath->query( './/option[@selected]', $field );
		$value = $selected->length ? $selected->item(0)->getAttribute( 'value' ) : $field->getElementsByTagName( 'option' )->item(0)->getAttribute( 'value' );
	} elseif ( 'textarea' === $field->tagName ) {
		$value = $field->textContent;
	}
	$pairs[] = rawurlencode( $field->getAttribute( 'name' ) ) . '=' . rawurlencode( $value );
}
parse_str( implode( '&', $pairs ), $posted );
$reopened = TCNexus_Course_Builder::sanitize_tc_lens_timeline( array( array_merge( $row, $posted['timeline'][0] ) ) );
trade_check( $data === $reopened[0]['data'], 'Rendered fields round-trip without losing old context, option actions or premiums' );
trade_check( 3 === $xpath->query( '//input[@type="date"]' )->length, 'Each option and its add template have a native calendar field' );

$row['trade']['legs'] = '';
$row['trade']['assetType'] = 'invalid';
$empty = TCNexus_Course_Builder::sanitize_tc_lens_timeline( array( $row ) )[0]['data'];
trade_check( array() === $empty['legs'], 'Deleting the last leg does not create a phantom option' );
trade_check( 'stock' === $empty['assetType'], 'Stock is the default for unsupported types' );
$row['trade']['legs'] = "buy | call | 1 | 500 | 2026-12-18\n";
$legacy = TCNexus_Course_Builder::sanitize_tc_lens_timeline( array( $row ) )[0]['data'];
trade_check( 1 === count( $legacy['legs'] ) && 'call' === $legacy['legs'][0]['side'], 'Legacy text legs still load' );
echo "TC Lens PHP data, render and form round-trip checks pass.\n";
