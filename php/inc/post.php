<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require '../vendor/autoload.php';
require './config.php';

$form_valid        = true;
$form_errors       = array();
$availableServices = array( 'Domov na mieru', 'Habitat Konfigurátor', 'Archicheck' );

if ( 'POST' === $_SERVER['REQUEST_METHOD'] ) {
	if ( isset( $_POST['form']['newsletter'] ) ) {
		$email   = isset( $_POST['form']['email'] ) ? filter_var( $_POST['form']['email'], FILTER_SANITIZE_EMAIL ) : null;
		$consent = isset( $_POST['form']['consent'] ) ? true : false;

		if ( empty( $email ) || $_POST['form']['email'] !== $email || ! filter_var( $email, FILTER_VALIDATE_EMAIL ) ) {
			$form_valid    = false;
			$form_errors[] = 'Zadajte prosím platnú e-mailovú adresu.';
		}

		if ( $consent !== true ) {
			$form_valid    = false;
			$form_errors[] = 'Musíte súhlasiť so spracovaním osobných údajov.';
		}

		if ( true === $form_valid ) {
			$subscriber = array(
				'subscriber_data'        => array(
					'email' => $email,
				),
				'resubscribe'            => true,
				'trigger_autoresponders' => true,
			);

			try {
				$ecomail  = new Ecomail( constant( 'ECOMAIL_API_KEY' ) );
				$response = $ecomail->addSubscriber( (int) constant( 'ECOMAIL_LIST_ID' ), $subscriber );
				if ( ! is_array( $response ) || $email !== $response['email'] ) {
					throw new Exception( 'error' );
				}

				http_response_code( 200 );
				echo '<strong>Boli ste prihlásený. Ďakujeme.</strong>';
				die();
			} catch ( Exception $e ) {
				// Activation mail not sent, set a 403 (forbidden) response code.
				http_response_code( 403 );
				echo '<strong>Pri prihlásení nastava chyba, skúste to znova.</strong>';
				die();
			}
		} else {
			// Form is not valid.
			http_response_code( 403 );
			echo '<ul><li>';
			echo implode( '</li><li>', $form_errors );
			echo '</li></ul>';
			die();
		}
	} else {
		$name     = isset( $_POST['form']['name'] ) ? filter_var( $_POST['form']['name'], FILTER_SANITIZE_STRING ) : null;
		$email    = isset( $_POST['form']['email'] ) ? filter_var( $_POST['form']['email'], FILTER_SANITIZE_EMAIL ) : null;
		$phone    = isset( $_POST['form']['phone'] ) ? filter_var( $_POST['form']['phone'], FILTER_SANITIZE_STRING ) : null;
		$text     = isset( $_POST['form']['text'] ) ? filter_var( $_POST['form']['text'], FILTER_SANITIZE_STRING ) : null;
		$services = isset( $_POST['form']['services'] ) ? array_intersect( $availableServices, $_POST['form']['services'] ) : null;
		$consent  = isset( $_POST['form']['consent'] ) ? true : false;

		if ( empty( $name ) ) {
			$form_valid    = false;
			$form_errors[] = 'Prosím zadajte Vaše meno a priezvisko.';
		} else {
			$name_parts = explode( ' ', $name );
			if ( empty( $name_parts[0] ) || empty( $name_parts[1] ) ) {
				$form_valid    = false;
				$form_errors[] = 'Prosím zadajte Vaše meno aj priezvisko.';
			}
		}
		if ( empty( $email ) || $_POST['form']['email'] !== $email || ! filter_var( $email, FILTER_VALIDATE_EMAIL ) ) {
			$form_valid    = false;
			$form_errors[] = 'Zadajte prosím platnú e-mailovú adresu.';
		}

		if ( $consent !== true ) {
			$form_valid    = false;
			$form_errors[] = 'Musíte súhlasiť so spracovaním osobných údajov.';
		}

		if ( true === $form_valid ) {
			// Instantiation and passing `true` enables exceptions.
			$mail = new PHPMailer( true );

			try {
				$mail->isSMTP();
				$mail->CharSet    = 'UTF-8';
				$mail->Encoding   = 'base64';
				$mail->Host       = SMTP_HOST;
				$mail->SMTPAuth   = SMTP_SMTPAUTH;
				$mail->Username   = SMTP_USERNAME;
				$mail->Password   = SMTP_PASSWORD;
				$mail->SMTPSecure = SMTP_SMTPSECURE;
				$mail->Port       = SMTP_PORT;

				$mail->setFrom( SMTP_USERNAME, SMTP_FROMNAME );
				$mail->addAddress( EMAIL_RECIPIENT );
				$mail->addReplyTo( $email, $name );

				$mail->isHTML( true );
				$mail->Subject = 'Habitat kontaktný formulár';
				$mail->Body   .= '<strong>Vaše meno:</strong> ' . $name . '<br>';
				$mail->Body   .= '<strong>E-mail:</strong> ' . $email . '<br>';
				if ( ! empty( $phone ) ) {
					$mail->Body .= '<strong>Telefónne číslo:</strong> ' . $phone . '<br>';
				}
				if ( ! empty( $services ) ) {
					$mail->Body .= '<strong>Záujem o služby:</strong> ' . implode( ', ', $services ) . '<br>';
				}
				if ( ! empty( $text ) ) {
					$mail->Body .= '<strong>Popis projektu:</strong> <br>' . $text . '<br><br>';
				}
				$mail->Body .= '<strong>Čas odoslania:</strong> ' . date( 'Y/m/d H:i:s' );

				$mail->send();
			} catch ( Exception $e ) {
				// Activation mail not sent, set a 403 (forbidden) response code.
				http_response_code( 403 );
				echo '<strong>Správu sa nepodarilo odoslať, skúste to znova.</strong>';
				die();
			}

			http_response_code( 200 );
			echo '<strong>Správa bola odoslaná. Ďakujeme.</strong>';
			die();
		} else {
			// Form is not valid.
			http_response_code( 403 );
			echo '<strong>Pri odosielaní sa vyskytli nasledovné problémy</strong>';
			echo '<ul><li>';
			echo implode( '</li><li>', $form_errors );
			echo '</li></ul>';
			die();
		}
	}
} else {
	// Not a POST request, set a 403 (forbidden) response code.
	http_response_code( 403 );
	echo '<strong>Pri odosielaní sa vyskytol problém, skúste to znova.</strong>';
	die();
}
