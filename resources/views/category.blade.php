@extends('main')

@section('title')
    Danh sách khóa học
@endsection

@section('content')
<div class="main-content category-page">
    <div class="banner">
        <img src="assets/img/red-gym-banner.jpg" width="100%" height="140px"/>
    </div>
    <div class="container">
        <div class="row-fluid">
            <div class="span2 block-left">
                <div class="block-left-title">DANH MỤC KHÓA HỌC</div>
                <ul class="list-unstyled list-category">
                    <?php foreach ($category as $c):?>
                        <li><a href="{{URL::route('subCategory', array($c->id))}}" class="back-link">{{$c->the_loai}}</a></li>
                    <?php endforeach;?>
                </ul>
            </div>
            <div class="span10">
                <h1 class="page-title">DANH MỤC KHÓA HỌC</h1>
                <div class="row-fluid list">
                    <?php foreach ($category as $c):?>
                        <div class="span4">
                            <div class="course-grid-item box-shadow">
                                <div class="course-grid-image">
                                    <img alt="{{$c->the_loai}}" src="{{$c->anh_dai_dien}}" width="100%">
                                </div>
                                <div class="course-grid-info">
                                    <h3 class="course-grid-name">{{$c->the_loai}}</h3>
                                    <div class="course-description">
                                        <p>{{$c->mo_ta}}</p> 
                                    </div>
                                    <div class="course-closing-date">
                                        <span class="cgt-label">Số lượng khóa học: {{$c->number}}</span>
                                    </div>
                                    <div class="course-action">
                                        <a class="course-view-more" href="{{URL::route('subCategory', array($c->id))}}">Xem tất cả khóa học</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach;?>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection