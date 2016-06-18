#!/usr/bin/env php
<?php
// application.php

require __DIR__.'/vendor/autoload.php';

use Symfony\Component\Console\Application;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Output\OutputInterface;

$application = new Application();
$application
	->register('json:update')
	->setDescription('Create a new data set')
	->addArgument(
		'token',
		InputArgument::REQUIRED,
		'Contentful token'
	)
	->addArgument(
		'space',
		InputArgument::REQUIRED,
		'Contentful space id'
	)
	->addArgument(
		'content-type',
		InputArgument::REQUIRED,
		'Contentful content type id'
	)
	->setCode(function(InputInterface $input, OutputInterface $output) {
		$token = $input->getArgument('token');
		$space = $input->getArgument('space');
		$locale = 'da-DK';

		$client = new \Contentful\Delivery\Client($token, $space);
		/** @var \Contentful\Delivery\Space $space */
		$query = new \Contentful\Delivery\Query();
		$query->setInclude(10);
		$query->setLimit(1000);
		$query->setContentType($input->getArgument('content-type'));

		$entries = $client->getEntries($query);

		$field = function($fieldName, \Contentful\Delivery\DynamicEntry $entry) {
			$methodName = 'get' . ucfirst($fieldName);
			$value = $entry->$methodName();
			if (is_string($value)) {
				return trim($value);
			}
			if (is_int($value)) {
				return $value;
			}
			if (is_array($value)) {
				foreach ($value as $relatedItem) {
					#var_dump($relatedItem->getContentType());
				}
				return;
			}
		};

		$slugify = function($string) {
			$value = mb_strtolower($string);
			$transliteration = array(
				'ä' => 'ae',
				'ö' => 'oe',
				'ü' => 'ue',
				'ß' => 'ss',
				'å' => 'aa',
				'ø' => 'oe',
				'æ' => 'ae'
			);
			$value = strtr($value, $transliteration);

			$spaceCharacter = '-';
			$value = preg_replace('/[ \-+_]+/', $spaceCharacter, $value);

			$value = preg_replace('/[^-a-z0-9.\\' . $spaceCharacter . ']/i', '', $value);

			$value = preg_replace('/\\' . $spaceCharacter . '{2,}/', $spaceCharacter, $value);
			$value = trim($value, $spaceCharacter);

			return $value;
		};
		$data = [];

		/** @var \Contentful\Delivery\DynamicEntry $entry */
		foreach ($entries as $entry) {
			#var_dump($entry->jsonSerialize()->fields);
			$data[] = [
				'name' => $field('name', $entry),
				'teaser' => $field('teaser', $entry),
				'description' => $field('description', $entry),
				'min_participants' => $field('participantsMin', $entry),
				'max_participants' => $field('participantsMax', $entry),
				'min_age' => $field('ageMin', $entry),
				'max_age' => $field('ageMax', $entry),
				'min_time' => $field('durationMin', $entry),
				'max_time' => $field('durationMax', $entry),
				'inside' =>  (boolean) $field('indoor', $entry) ? TRUE : FALSE,
				'outdoor' => (boolean) $field('outdoor', $entry) ? TRUE : FALSE,
				'youtube' => $field('videos', $entry),
				'tags' => $field('tags', $entry),
				'url' => $slugify($field('name', $entry))
			];
		}

		$output->writeln(json_encode($data));
	});
$application->run();

