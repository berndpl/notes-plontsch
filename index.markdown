---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
title: Notes
---

<ul class="posts">
  {% assign current_year = "" %}
  {% for post in site.posts %}
    {% assign post_year = post.date | date: "%Y" %}
    {% if current_year != post_year %}
      <li class="year-separator">
        <h3>{{ post_year }}</h3>
      </li>
      {% assign current_year = post_year %}
    {% endif %}
    <li>
      <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
      <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %-d" }}</time>
    </li>
  {% endfor %}
</ul>